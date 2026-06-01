import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme.
//
// When an image is shared (e.g. a Xiaohongshu screenshot), it is compressed
// to JPEG and stored in the App Group Preferences so the CapacitorBridge can
// pass it to the Claude Vision extraction path.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

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
        var foundImage: UIImage?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Collect URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = foundTitle ?? item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }

                // Collect image (for platforms like Xiaohongshu that block HTML scraping)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if foundImage != nil { return }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let imageURL = data as? URL,
                                  let imageData = try? Data(contentsOf: imageURL),
                                  let image = UIImage(data: imageData) {
                            foundImage = image
                        }
                    }
                }

                // Collect plain text (fallback URL source)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, foundURL == nil,
                           let url = self.extractURL(from: text) {
                            foundURL = url
                            foundTitle = foundTitle ?? text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Store image in App Group so CapacitorBridge can pass it to Claude Vision
            let hasImage = self.savePendingImage(foundImage)

            let url = foundURL ?? ""
            let title = foundTitle ?? ""

            if !url.isEmpty || hasImage {
                self.openApp(url: url, title: title, hasImage: hasImage)
            } else {
                self.finish()
            }
        }
    }

    // ── Image ─────────────────────────────────────────────────────────────────

    @discardableResult
    private func savePendingImage(_ image: UIImage?) -> Bool {
        guard let image else { return false }

        // Compress to keep within UserDefaults size limits (~1 MB after base64)
        // 0.4 quality gives ~150–300 KB JPEG for a typical iPhone screenshot
        guard let jpegData = image.jpegData(compressionQuality: 0.4) else { return false }

        // Guard against oversized images (> 750 KB compressed ≈ ~1 MB base64)
        if jpegData.count > 750_000 {
            // Halve resolution before re-compressing
            let scale = sqrt(Double(750_000) / Double(jpegData.count))
            let newSize = CGSize(
                width: image.size.width * scale,
                height: image.size.height * scale
            )
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            let resized = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            guard let resizedData = resized?.jpegData(compressionQuality: 0.4) else { return false }
            let base64 = resizedData.base64EncodedString()
            return writeToAppGroup(base64: base64)
        }

        let base64 = jpegData.base64EncodedString()
        return writeToAppGroup(base64: base64)
    }

    private func writeToAppGroup(base64: String) -> Bool {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareImageType")
        defaults.synchronize()
        return true
    }

    // ── URL extraction ────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Open main app ─────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app with the deep link.
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
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
