import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot image) from the iOS Share Sheet and
// opens the main TravelPanel app via travelpanel://share?url=...&title=...
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
//
// Image capture: Xiaohongshu and WeChat block server-side scraping. When an image
// is shared alongside a URL, the extension captures it, compresses it to a small
// JPEG (~512px, 0.5 quality), and saves it to the App Group UserDefaults under
// "pendingShareImage". CapacitorBridge reads this on app open and passes it to
// the /api/import endpoint, which feeds it to Claude Vision for extraction.

class ShareViewController: UIViewController {

    // Max dimension for the screenshot saved to App Group (keeps size under ~200 KB base64)
    private static let maxImageDimension: CGFloat = 512
    private static let imageJpegQuality: CGFloat  = 0.5

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
                            // Also look for an image in the remaining attachments
                            self.extractImageIfPresent(from: attachments, excluding: attachment) { imageBase64 in
                                self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64)
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
                            self.extractImageIfPresent(from: attachments, excluding: attachment) { imageBase64 in
                                self.openApp(url: url, title: text, imageBase64: imageBase64)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image-only share (no URL) — save image, use page URL from context if any
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image = Self.uiImage(from: data)
                        let base64 = image.flatMap { Self.compressImage($0) }?.base64EncodedString()
                        // No URL available — use a placeholder so the share page still opens
                        self.openApp(url: "about:blank", title: "Shared image", imageBase64: base64)
                    }
                    return
                }
            }
        }

        finish()
    }

    // Looks for the first image attachment (skipping `excluded`) and returns compressed base64.
    private func extractImageIfPresent(
        from attachments: [NSItemProvider],
        excluding excluded: NSItemProvider,
        completion: @escaping (String?) -> Void
    ) {
        let imageProvider = attachments.first {
            $0 !== excluded && $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
        }
        guard let provider = imageProvider else {
            completion(nil)
            return
        }
        provider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
            let image  = Self.uiImage(from: data)
            let base64 = image.flatMap { Self.compressImage($0) }?.base64EncodedString()
            completion(base64)
        }
    }

    // Decode a loaded NSItemProvider result into a UIImage.
    private static func uiImage(from item: NSSecureCoding?) -> UIImage? {
        if let image = item as? UIImage { return image }
        if let url   = item as? URL     { return UIImage(contentsOfFile: url.path) }
        if let data  = item as? Data    { return UIImage(data: data) }
        return nil
    }

    // Downscale and compress an image to a small JPEG for App Group storage.
    private static func compressImage(_ image: UIImage) -> Data? {
        let size  = image.size
        let scale = min(maxImageDimension / max(size.width, size.height), 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: imageJpegQuality)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String? = nil) {
        // Always persist to App Group so the image is available regardless of launch path.
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
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

        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for wiring instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let b64 = imageBase64 {
            defaults.set(b64, forKey: "pendingShareImage")
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
