import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
// When an image payload is available (Xiaohongshu thumbnails, screenshots), it is
// JPEG-compressed and stored in App Group Preferences so the web layer can pass it
// to Claude Vision for content extraction.

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

        // Collect attachments across all input items
        let allAttachments = items.flatMap { $0.attachments ?? [] }

        // Priority 1: a direct URL attachment (with optional image)
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let url = data as? URL {
                        let title = items.first?.attributedContentText?.string ?? url.host ?? ""
                        // Try to extract an image from the same batch of attachments
                        self.extractImageIfAvailable(from: allAttachments) { imageBase64, mimeType in
                            self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64, imageMimeType: mimeType)
                        }
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        // Priority 2: plain text that may contain a URL
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let text = data as? String, let urlString = self.extractURL(from: text) {
                        self.extractImageIfAvailable(from: allAttachments) { imageBase64, mimeType in
                            self.openApp(url: urlString, title: text, imageBase64: imageBase64, imageMimeType: mimeType)
                        }
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        finish()
    }

    // ── Image extraction ─────────────────────────────────────────────────────

    private func extractImageIfAvailable(
        from attachments: [NSItemProvider],
        completion: @escaping (_ base64: String?, _ mimeType: String?) -> Void
    ) {
        // Look for a JPEG, PNG, or generic image attachment
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
        for attachment in attachments {
            for typeId in imageTypes {
                if attachment.hasItemConformingToTypeIdentifier(typeId) {
                    attachment.loadItem(forTypeIdentifier: typeId) { data, _ in
                        guard let image = self.uiImageFromItem(data) else {
                            completion(nil, nil)
                            return
                        }
                        // Resize to max 800 px on the long edge, compress to JPEG ~60 %
                        let resized = self.resizedImage(image, maxDimension: 800)
                        guard let jpegData = resized.jpegData(compressionQuality: 0.6),
                              jpegData.count < 2 * 1024 * 1024 else {
                            // Skip oversized images
                            completion(nil, nil)
                            return
                        }
                        completion(jpegData.base64EncodedString(), "image/jpeg")
                    }
                    return
                }
            }
        }
        // No image found
        completion(nil, nil)
    }

    private func uiImageFromItem(_ item: NSSecureCoding?) -> UIImage? {
        if let image = item as? UIImage { return image }
        if let url = item as? URL, let data = try? Data(contentsOf: url) { return UIImage(data: data) }
        if let data = item as? Data { return UIImage(data: data) }
        return nil
    }

    private func resizedImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longestEdge = max(size.width, size.height)
        guard longestEdge > maxDimension else { return image }
        let scale = maxDimension / longestEdge
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    // ── URL extraction ───────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ─────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String?, imageMimeType: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

        // Store image in App Group before opening the app
        saveToAppGroup(url: url, title: title, imageBase64: imageBase64, imageMimeType: imageMimeType)

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

        // Fallback: App Group is already written above; main app reads on next launch
        finish()
    }

    // ── App Group storage ────────────────────────────────────────────────────

    private func saveToAppGroup(url: String, title: String, imageBase64: String?, imageMimeType: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let img = imageBase64 {
            defaults.set(img, forKey: "pendingShareImageBase64")
            defaults.set(imageMimeType ?? "image/jpeg", forKey: "pendingShareImageMimeType")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
            defaults.removeObject(forKey: "pendingShareImageMimeType")
        }
        defaults.synchronize()
    }

    // ── Finish ───────────────────────────────────────────────────────────────

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
