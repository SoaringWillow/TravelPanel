import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasScreenshot=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When a screenshot is present (common for Xiaohongshu, WeChat posts), it is
// resized and written to the App Group UserDefaults under "pendingShareImageBase64"
// so the main app can pass it to Claude Vision for better substance extraction.
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

        // Collect URL and image in parallel, then open the app with both.
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImage: UIImage?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string

            for attachment in attachments {
                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, extractedURL == nil {
                            extractedURL = url.absoluteString
                            extractedTitle = itemTitle ?? url.host ?? ""
                        }
                    }
                }

                // Image attachment (screenshot of the post)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if extractedImage == nil {
                            if let image = data as? UIImage {
                                extractedImage = image
                            } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                                extractedImage = image
                            }
                        }
                    }
                }

                // Plain text (may contain a URL as fallback)
                if extractedURL == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String,
                           let url = self.extractURL(from: text),
                           extractedURL == nil {
                            extractedURL = url
                            extractedTitle = extractedTitle ?? text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Store screenshot in App Group for Vision extraction
            var hasScreenshot = false
            if let image = extractedImage {
                hasScreenshot = self.storeImageInAppGroup(image)
            }

            if let url = extractedURL {
                self.openApp(url: url, title: extractedTitle ?? "", hasScreenshot: hasScreenshot)
            } else {
                self.finish()
            }
        }
    }

    // ─── Image storage ─────────────────────────────────────────────────────────

    /// Resizes and JPEG-compresses the image, then writes it to App Group UserDefaults.
    /// Returns true if the image was stored successfully.
    @discardableResult
    private func storeImageInAppGroup(_ image: UIImage) -> Bool {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }

        // Resize to max 1024px on the longest side to keep the base64 payload reasonable.
        let resized = resizeImage(image, maxDimension: 1024)

        // Compress to JPEG, targeting ≤400 KB.
        var quality: CGFloat = 0.8
        var data = resized.jpegData(compressionQuality: quality)
        while let d = data, d.count > 400_000, quality > 0.3 {
            quality -= 0.1
            data = resized.jpegData(compressionQuality: quality)
        }

        guard let jpegData = data else { return false }
        let base64 = jpegData.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.synchronize()
        return true
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxDimension else { return image }

        let scale = maxDimension / longest
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasScreenshot: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
            URLQueryItem(name: "hasScreenshot", value: hasScreenshot ? "1" : "0"),
        ]

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

        // Fallback: write to App Group and let the main app pick it up on next launch.
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
