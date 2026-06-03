import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Image data is stored in App Group UserDefaults so it survives the scheme hop.
// The web layer reads it via @capacitor/preferences and passes it to /api/import
// for Claude Vision extraction — critical for Xiaohongshu/WeChat whose pages
// block server-side scraping.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        var extractedURL: String?
        var extractedTitle: String?
        var extractedImageData: String?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let candidateTitle = item.attributedContentText?.string

            for attachment in attachments {
                // ── URL attachment ──────────────────────────────────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, extractedURL == nil {
                            extractedURL   = url.absoluteString
                            extractedTitle = candidateTitle ?? url.host ?? ""
                        }
                    }
                    continue
                }

                // ── Plain text (may contain a URL) ──────────────────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String,
                           let found = self.extractURL(from: text),
                           extractedURL == nil {
                            extractedURL   = found
                            extractedTitle = candidateTitle ?? text
                        }
                    }
                    continue
                }

                // ── Image attachment (Xiaohongshu/WeChat screenshot) ────────
                let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
                for imageType in imageTypes where attachment.hasItemConformingToTypeIdentifier(imageType) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: imageType) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self, extractedImageData == nil else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let bytes = try? Data(contentsOf: url) {
                            image = UIImage(data: bytes)
                        } else if let bytes = data as? Data {
                            image = UIImage(data: bytes)
                        } else {
                            image = nil
                        }
                        if let img = image, let compressed = self.compressImage(img) {
                            extractedImageData = compressed.base64EncodedString()
                        }
                    }
                    break // only first image attachment
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = extractedURL {
                self.openApp(url: url, title: extractedTitle ?? "", imageData: extractedImageData)
            } else {
                self.finish()
            }
        }
    }

    // ── Image compression ─────────────────────────────────────────────────────

    private func compressImage(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 1024
        let size  = image.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)

        let targetSize: CGSize
        if scale < 1.0 {
            targetSize = CGSize(width: (size.width  * scale).rounded(),
                                height: (size.height * scale).rounded())
        } else {
            targetSize = size
        }

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: targetSize, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: 0.5)
    }

    // ── URL extraction from plain text ────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App opening ───────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageData: String?) {
        // Always save to App Group so CapacitorBridge can read it on launch.
        savePendingShareToAppGroup(url: url, title: title, imageData: imageData)

        var components    = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"
        var items: [URLQueryItem] = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageData != nil {
            items.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = items

        guard let deepLink = components.url else {
            finish(); return
        }

        // iOS 13+ — open via responder chain
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

        // Fallback — app wasn't running; App Group data will be read on next launch
        finish()
    }

    // ── App Group persistence ─────────────────────────────────────────────────

    private func savePendingShareToAppGroup(url: String, title: String, imageData: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let data = imageData {
            defaults.set(data,        forKey: "pendingShareImageData")
            defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        } else {
            defaults.removeObject(forKey: "pendingShareImageData")
            defaults.removeObject(forKey: "pendingShareImageMime")
        }
        defaults.synchronize()
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
