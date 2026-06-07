import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL + optional screenshot image from the iOS Share Sheet and
// routes them into the main TravelPanel app.
//
// URL is delivered via travelpanel://share?url=...&title=... (deep link).
// Image data is always stored in App Group (too large for URL scheme) under
// the key "pendingShareImage" as a base64-encoded JPEG. CapacitorBridge reads
// it on app resume and hands it to the share flow via sessionStorage.
//
// The image capture enables Claude Vision extraction for platforms like
// Xiaohongshu and WeChat that block standard URL scraping.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// and image attachments (screenshot of post).

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var foundURL: String?
        var foundTitle: String?
        var foundImageBase64: String?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // ── URL attachment ────────────────────────────────────────────
                if foundURL == nil, attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        } else if let text = data as? String, let url = self.extractURL(from: text) {
                            foundURL = url
                            foundTitle = text
                        }
                    }
                }

                // ── Image attachment (screenshot/post image) ─────────────────
                // Captured for Vision-based extraction on platforms that block scraping.
                if foundImageBase64 == nil, attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            image = nil
                        }
                        // Compress to JPEG (0.65 quality ≈ 100–300 KB for a typical screenshot)
                        if let img = image, let jpeg = img.jpegData(compressionQuality: 0.65) {
                            foundImageBase64 = jpeg.base64EncodedString()
                        }
                    }
                }

                // ── Plain-text fallback for URL ───────────────────────────────
                if foundURL == nil, attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String, let url = self?.extractURL(from: text) {
                            if foundURL == nil { foundURL = url; foundTitle = text }
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "", imageBase64: foundImageBase64)
            } else {
                self.finish()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Always write to App Group first so the image is available regardless of
        // which opening method the app uses (URL scheme or App Group fallback).
        savePendingShare(url: url, title: title, imageBase64: imageBase64)

        // Build the URL scheme deep link (URL + title only; image travels via App Group).
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Try opening the main app via the responder chain (iOS 13+).
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in
                    self?.finish()
                }
                return
            }
            responder = r.next
        }

        // Responder chain unavailable — App Group fallback already written above.
        finish()
    }

    private func savePendingShare(url: String, title: String, imageBase64: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for setup instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")

        if let image = imageBase64 {
            defaults.set(image, forKey: "pendingShareImage")
        } else {
            defaults.removeObject(forKey: "pendingShareImage")
        }

        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
