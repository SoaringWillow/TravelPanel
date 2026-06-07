import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image/screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app via the travelpanel://share URL scheme.
//
// Vision path: when the user shares an image (e.g. a Xiaohongshu screenshot),
// we compress it to a JPEG thumbnail (~200×200 px, quality 0.4) and include it
// as a base64 query param. Claude Vision on the server then extracts locations
// and substance from the image rather than relying on blocked URL scraping.
//
// Supported source types: URLs, web pages, images, plain text with a URL.

class ShareViewController: UIViewController {

    // Max pixel dimension for the thumbnail passed to the server.
    // Keeps the base64 URL param under ~12 KB (safe for URL schemes).
    private let thumbnailMaxDimension: CGFloat = 240
    private let thumbnailJpegQuality: CGFloat = 0.45

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // MARK: – Main extraction logic

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            // ── Priority 1: explicit URL attachment ──
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            // Also check if there's an accompanying image in the same item
                            self.extractOptionalImage(from: attachments) { imageBase64 in
                                self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // ── Priority 2: image attachment (e.g. Xiaohongshu screenshot) ──
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image = self.imageFrom(itemProviderData: data)
                        let base64 = image.flatMap { self.compressThumbnail($0) }
                        // Use a placeholder URL so the server knows it's an image-only share
                        let placeholderURL = "shared://image"
                        let title = item.attributedContentText?.string ?? "Image"
                        self.openApp(url: placeholderURL, title: title, imageBase64: base64)
                    }
                    return
                }
            }

            // ── Priority 3: plain text containing a URL ──
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.openApp(url: url, title: text, imageBase64: nil)
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

    // MARK: – Image helpers

    /// Check sibling attachments for an image without blocking on the URL load.
    private func extractOptionalImage(
        from attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { completion(nil); return }
                    let image = self.imageFrom(itemProviderData: data)
                    completion(image.flatMap { self.compressThumbnail($0) })
                }
                return
            }
        }
        completion(nil)
    }

    private func imageFrom(itemProviderData data: Any?) -> UIImage? {
        if let image = data as? UIImage { return image }
        if let imageData = data as? Data { return UIImage(data: imageData) }
        if let url = data as? URL { return UIImage(contentsOfFile: url.path) }
        return nil
    }

    /// Scales and JPEG-compresses the image to a small thumbnail suitable for
    /// inclusion in a URL query param (targets < 12 KB base64).
    private func compressThumbnail(_ image: UIImage) -> String? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }

        let scale = min(thumbnailMaxDimension / size.width, thumbnailMaxDimension / size.height, 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let scaled = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpeg = scaled.jpegData(compressionQuality: thumbnailJpegQuality) else { return nil }

        // Only include if small enough for a URL query param (< 15 KB base64 ≈ ~11 KB binary)
        guard jpeg.count < 11_000 else { return nil }

        return jpeg.base64EncodedString()
    }

    // MARK: – URL extraction

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: – App opening

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let b64 = imageBase64 {
            queryItems.append(URLQueryItem(name: "imageBase64", value: b64))
        }
        components.queryItems = queryItems

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
