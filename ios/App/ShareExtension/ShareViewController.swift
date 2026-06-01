import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL, plain text, or image (screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app with a travelpanel://share?... deep link.
//
// Xiaohongshu / WeChat fix:
//   • attributedContentText carries the post body text even when web scraping is blocked
//   • image attachments (screenshots) are resized/compressed and forwarded as base64
//     so the server can use Claude Vision for extraction
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

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Capture content text from the share item (e.g. Xiaohongshu post body)
            let sharedText = item.attributedContentText?.string ?? ""

            // Priority 1: URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedTitle?.string ?? url.host ?? ""
                            self.captureImageIfPresent(attachments: attachments) { imageBase64 in
                                self.openApp(
                                    url: url.absoluteString,
                                    title: title,
                                    sharedText: sharedText,
                                    imageBase64: imageBase64
                                )
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
                            self.captureImageIfPresent(attachments: attachments) { imageBase64 in
                                self.openApp(
                                    url: url,
                                    title: text,
                                    sharedText: sharedText,
                                    imageBase64: imageBase64
                                )
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image only (screenshot of a Xiaohongshu post)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let imageBase64 = self.compressImage(from: data)
                        self.openApp(
                            url: "travelpanel://vision-only",
                            title: sharedText.isEmpty ? "Screenshot" : String(sharedText.prefix(120)),
                            sharedText: sharedText,
                            imageBase64: imageBase64
                        )
                    }
                    return
                }
            }
        }

        finish()
    }

    // ── Image helpers ─────────────────────────────────────────────────────────

    private func captureImageIfPresent(
        attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { completion(nil); return }
                    completion(self.compressImage(from: data))
                }
                return
            }
        }
        completion(nil)
    }

    // Scales to 512×512 max, JPEG quality 0.4 → ≈15–40 KB → safe for URL scheme
    private func compressImage(from data: Any?) -> String? {
        var image: UIImage?
        if let img = data as? UIImage {
            image = img
        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
            image = img
        }
        guard let source = image else { return nil }

        let maxDim: CGFloat = 512
        let scale = min(maxDim / source.size.width, maxDim / source.size.height, 1.0)
        let newSize = CGSize(
            width: (source.size.width * scale).rounded(),
            height: (source.size.height * scale).rounded()
        )

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        source.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpeg = resized?.jpegData(compressionQuality: 0.4) else { return nil }
        return jpeg.base64EncodedString()
    }

    // ── URL extraction from text ──────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Deep-link construction ────────────────────────────────────────────────

    private func openApp(url: String, title: String, sharedText: String, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"

        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        if !sharedText.isEmpty {
            queryItems.append(URLQueryItem(name: "text", value: String(sharedText.prefix(2000))))
        }

        // Compressed JPEG as base64 — typically 20–55 KB, within iOS URL scheme limits
        if let image = imageBase64 {
            queryItems.append(URLQueryItem(name: "imageData", value: image))
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

        // Fallback: App Group (image omitted — too large for UserDefaults)
        savePendingShareToAppGroup(url: url, title: title, sharedText: sharedText)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, sharedText: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(sharedText, forKey: "pendingShareText")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
