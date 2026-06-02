import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme.
//
// For anti-scraping platforms (Xiaohongshu, WeChat), the extension also captures
// any image attachment (post screenshot / preview) and stores it in the App Group
// so the web layer can pass it to Claude Vision for richer extraction.
//
// Supported source types: URLs, web pages, plain text containing a URL, images.

// Platforms that block URL scraping — image capture improves extraction quality.
private let antiScrapingHosts = ["xiaohongshu.com", "xhslink.com", "xhs.link", "weixin.qq.com", "mp.weixin"]

class ShareViewController: UIViewController {

    private var extractedURL: String = ""
    private var extractedTitle: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // MARK: - Main extraction logic

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.extractedURL = url.absoluteString
                            self.extractedTitle = title
                            // For anti-scraping platforms, try to capture an image attachment
                            if self.isAntiScrapingURL(url.absoluteString) {
                                self.captureImageIfAvailable(from: attachments) {
                                    self.openApp(url: self.extractedURL, title: self.extractedTitle)
                                }
                            } else {
                                self.openApp(url: url.absoluteString, title: title)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 2: plain text that may contain a URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.openApp(url: url, title: text)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }

        finish()
    }

    // MARK: - Image capture

    private func isAntiScrapingURL(_ url: String) -> Bool {
        antiScrapingHosts.contains { url.contains($0) }
    }

    /// Looks for an image attachment and stores it in App Group as base64 JPEG,
    /// then calls `completion` regardless of whether an image was found.
    private func captureImageIfAvailable(from attachments: [NSItemProvider], completion: @escaping () -> Void) {
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]

        for attachment in attachments {
            for type in imageTypes {
                if attachment.hasItemConformingToTypeIdentifier(type) {
                    attachment.loadItem(forTypeIdentifier: type) { [weak self] data, _ in
                        defer { completion() }
                        guard let self else { return }

                        var image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else if let imgData = data as? Data, let img = UIImage(data: imgData) {
                            image = img
                        }

                        guard let img = image else { return }

                        // Compress to JPEG at 0.7 quality — keeps size manageable (~200–500 KB)
                        // while preserving readability for Claude Vision's OCR.
                        guard let jpeg = img.jpegData(compressionQuality: 0.7) else { return }

                        // Skip images larger than 4 MB (base64 would be ~5.3 MB — too large for UserDefaults)
                        guard jpeg.count <= 4 * 1024 * 1024 else { return }

                        let base64 = jpeg.base64EncodedString()
                        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
                        defaults.set(base64, forKey: "pendingShareImage")
                        defaults.set("image/jpeg", forKey: "pendingShareImageType")
                        defaults.synchronize()
                    }
                    return
                }
            }
        }

        // No image found — call completion immediately
        completion()
    }

    // MARK: - URL extraction helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - App opening

    private func openApp(url: String, title: String) {
        let hasImage = UserDefaults(suiteName: "group.com.travelpanel.app")?
            .string(forKey: "pendingShareImage") != nil

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            // Signal the web layer to read the image from App Group
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app via the responder chain (iOS 13+)
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

        // Fallback: write to App Group and let CapacitorBridge pick it up on next launch
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
