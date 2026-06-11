import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with travelpanel://share?url=...&title=...&hasImage=1
// The CapacitorBridge component routes the deep link to /share.
//
// For anti-scraping platforms (Xiaohongshu, WeChat), the screenshot is encoded as
// a base64 JPEG and stored in App Group UserDefaults so the import API can use
// Claude Vision instead of the blocked page scrape.
//
// Supported source types: URLs, plain text containing a URL, web pages + images.

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

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.extractImageThenShare(item: item, url: url.absoluteString, title: title)
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
                        if let text = data as? String, let urlString = self.extractURL(from: text) {
                            self.extractImageThenShare(item: item, url: urlString, title: text)
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

    // After finding the URL, look for an image attachment in the same share payload.
    // Xiaohongshu and similar apps often bundle a post screenshot alongside the link.
    private func extractImageThenShare(item: NSExtensionItem, url: String, title: String) {
        guard let attachments = item.attachments else {
            openApp(url: url, title: title, hasImage: false)
            return
        }

        // Find the first image-conforming attachment
        let imageAttachment = attachments.first {
            $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
            $0.hasItemConformingToTypeIdentifier("com.apple.uikit.image")
        }

        guard let imageAttachment else {
            openApp(url: url, title: title, hasImage: false)
            return
        }

        let typeId = imageAttachment.hasItemConformingToTypeIdentifier(UTType.image.identifier)
            ? UTType.image.identifier
            : "com.apple.uikit.image"

        imageAttachment.loadItem(forTypeIdentifier: typeId, options: nil) { [weak self] data, _ in
            guard let self else { return }

            var savedImage = false
            if let uiImage = data as? UIImage,
               let jpeg = self.compressImage(uiImage) {
                self.saveScreenshotToAppGroup(jpeg.base64EncodedString())
                savedImage = true
            } else if let fileURL = data as? URL,
                      let raw = try? Data(contentsOf: fileURL),
                      let uiImage = UIImage(data: raw),
                      let jpeg = self.compressImage(uiImage) {
                self.saveScreenshotToAppGroup(jpeg.base64EncodedString())
                savedImage = true
            }

            self.openApp(url: url, title: title, hasImage: savedImage)
        }
    }

    // Resize to max 800×800 and compress to JPEG — keeps the payload small while
    // preserving enough detail for Claude Vision to read captions and text overlays.
    private func compressImage(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(
            width:  (image.size.width  * scale).rounded(),
            height: (image.size.height * scale).rounded()
        )
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.72)
    }

    private func saveScreenshotToAppGroup(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareScreenshot")
        defaults.synchronize()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app with the deep link.
        // On iOS 13+, Share Extensions can open URLs via the responder chain.
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

        // Fallback: write to App Group so the main app picks it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
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
