import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives content from the iOS Share Sheet and opens the main TravelPanel
// app via the travelpanel://share URL scheme.
//
// Two-layer capture (mirrors the web extraction model):
//   Layer 1 — URL: the source post link, passed as ?url= in the deep link
//   Layer 2 — Image: screenshot/thumbnail stored in App Group for Claude Vision
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
// Xiaohongshu and WeChat posts often provide an image instead of (or alongside)
// a URL; the image is saved to App Group storage so the web layer can send it
// to the /api/import Claude Vision endpoint.

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

        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImage: UIImage?

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {

                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, extractedURL == nil {
                            extractedURL = url.absoluteString
                            if extractedTitle == nil {
                                extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                            }
                        }
                    }
                }

                // Plain text (may contain a URL for Xiaohongshu share links)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String {
                            if extractedURL == nil, let found = self.extractURL(from: text) {
                                extractedURL = found
                            }
                            if extractedTitle == nil {
                                extractedTitle = String(text.prefix(200))
                            }
                        }
                    }
                }

                // Image attachment (screenshot/post thumbnail from Xiaohongshu, WeChat, etc.)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if extractedImage == nil {
                            if let fileURL = data as? URL {
                                extractedImage = UIImage(contentsOfFile: fileURL.path)
                            } else if let image = data as? UIImage {
                                extractedImage = image
                            }
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Persist image to App Group so the web layer can use Claude Vision
            let hasImage = extractedImage != nil
            if let image = extractedImage {
                self.saveImageToAppGroup(image)
            }

            let url = extractedURL ?? ""
            let title = extractedTitle ?? ""

            // Open main app (or fall back to App Group for next launch)
            self.openApp(url: url, title: title, hasImage: hasImage)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func resizeAndEncode(_ image: UIImage, maxDimension: CGFloat = 1024) -> String? {
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.8)?.base64EncodedString()
    }

    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app"),
              let base64 = resizeAndEncode(image) else { return }
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.synchronize()
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        guard let deepLink = components.url else {
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

        // Fallback: write to App Group — main app picks up on next launch
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(hasImage ? "1" : "0", forKey: "pendingShareHasImage")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
