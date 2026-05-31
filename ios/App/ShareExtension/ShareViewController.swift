import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image thumbnail) from the iOS Share
// Sheet and opens the main TravelPanel app with:
//   travelpanel://share?url=...&title=...&imageData=<base64-jpeg>
//
// The imageData parameter enables Claude Vision extraction for platforms like
// Xiaohongshu and WeChat that block server-side page fetches. The thumbnail
// is compressed to ≤300×300px at JPEG quality 0.3 (~5–15 KB) to stay well
// within URL-scheme length limits.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images (when shared alongside a URL from social apps).

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Step 1: find URL ─────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        let allAttachments = items.flatMap { $0.attachments ?? [] }

        extractURL(from: items, attachments: allAttachments) { [weak self] url, title in
            guard let self, let url else { self?.finish(); return }
            // Step 2: find image (best-effort, non-blocking)
            self.extractImage(from: allAttachments) { imageBase64 in
                self.openApp(url: url, title: title ?? "", imageBase64: imageBase64)
            }
        }
    }

    // ── URL extraction ───────────────────────────────────────────────────────

    private func extractURL(
        from items: [NSExtensionItem],
        attachments: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        // Priority 1: a direct URL attachment
        for (attachment, item) in zip(attachments, items.flatMap { _ in items }) {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    if let url = data as? URL {
                        let title = item.attributedContentText?.string ?? url.host ?? ""
                        completion(url.absoluteString, title)
                    } else {
                        completion(nil, nil)
                    }
                }
                return
            }
        }

        // Priority 2: plain text that may contain a URL
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    if let text = data as? String, let url = self?.extractURL(from: text) {
                        completion(url, text)
                    } else {
                        completion(nil, nil)
                    }
                }
                return
            }
        }

        completion(nil, nil)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Image extraction + compression ───────────────────────────────────────

    private func extractImage(
        from attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    var image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let url = data as? URL {
                        image = UIImage(contentsOfFile: url.path)
                    } else if let d = data as? Data {
                        image = UIImage(data: d)
                    }
                    let base64 = image.flatMap { self?.compressThumbnail($0) }
                    completion(base64)
                }
                return
            }
        }
        completion(nil)
    }

    // Resize to fit within 300×300 and compress to ~5–15 KB JPEG.
    private func compressThumbnail(_ image: UIImage) -> String? {
        let maxSide: CGFloat = 300
        let size = image.size
        let scale = max(size.width, size.height) / maxSide
        let newSize = scale > 1
            ? CGSize(width: (size.width / scale).rounded(), height: (size.height / scale).rounded())
            : size

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.3)?.base64EncodedString()
    }

    // ── Deep link builder ────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"

        var queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        // Include thumbnail in URL scheme if small enough (~<50 KB base64 ≈ ~36 KB JPEG).
        // Larger images fall back to App Group storage only.
        if let imageBase64, imageBase64.count < 65_000 {
            queryItems.append(URLQueryItem(name: "imageData", value: imageBase64))
        }

        components.queryItems = queryItems

        // Save to App Group as a reliable fallback (covers the URL-scheme-blocked case)
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)

        guard let deepLink = components.url else {
            finish(); return
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

        // URL scheme open not available — App Group fallback already written above
        finish()
    }

    // ── App Group storage (fallback path) ────────────────────────────────────

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let imageBase64 {
            defaults.set(imageBase64, forKey: "pendingShareImage")
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
