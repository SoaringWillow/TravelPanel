import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional post screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which CapacitorBridge routes to /share.
//
// When an image is available (common on Xiaohongshu and WeChat, which block URL scraping),
// the image is compressed, base64-encoded, and stored in the shared App Group under
// the key "pendingShareImage". The web layer reads this via @capacitor/preferences
// and passes it to Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private let appGroupSuite = "group.com.travelpanel.app"
    private let maxImageDimension: CGFloat = 900

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
                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }

                // Plain text (may contain a URL)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, foundURL == nil,
                           let extracted = self.extractURL(from: text) {
                            foundURL = extracted
                            foundTitle = text
                        }
                    }
                }

                // Image attachment (screenshot of the post — key for Xiaohongshu/WeChat)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            image = nil
                        }
                        if let img = image, foundImageBase64 == nil {
                            foundImageBase64 = self.compressImage(img)
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

    // ── Image helpers ─────────────────────────────────────────────────────────

    private func compressImage(_ image: UIImage) -> String? {
        let resized = resizeImage(image, maxDimension: maxImageDimension)
        guard let jpeg = resized.jpegData(compressionQuality: 0.5) else { return nil }
        // Skip if too large (>400 KB compressed → ~533 KB base64, safe for App Group)
        guard jpeg.count < 400_000 else { return nil }
        return jpeg.base64EncodedString()
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longestSide = max(size.width, size.height)
        guard longestSide > maxDimension else { return image }

        let scale = maxDimension / longestSide
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    // ── URL helpers ───────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Deep link + App Group ─────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Write image to App Group before opening — CapacitorBridge reads it on activation.
        if let image = imageBase64,
           let defaults = UserDefaults(suiteName: appGroupSuite) {
            defaults.set(image, forKey: "pendingShareImage")
            defaults.synchronize()
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        guard let deepLink = components.url else {
            savePendingShareToAppGroup(url: url, title: title)
            finish()
            return
        }

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

        // Fallback: write URL/title to App Group so the app picks them up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
