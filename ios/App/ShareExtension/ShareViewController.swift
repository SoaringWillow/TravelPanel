import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + thumbnail image) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For platforms that block URL scraping (Xiaohongshu, WeChat, Douyin), the extension
// also captures the post thumbnail image and writes it to the App Group UserDefaults so
// the main app can send it to Claude Vision for content extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // App Group suite — must match the one in CapacitorBridge.tsx
    private let appGroupSuite = "group.com.travelpanel.app"

    // Maximum JPEG size stored in UserDefaults (avoid hitting storage limits)
    private let maxImageBytes = 400_000

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // Collect URL + optional image from ALL attachments, then open the app once both are ready.
    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var extractedURL: String?
        var extractedTitle: String?
        var extractedImageData: Data?

        let group = DispatchGroup()
        let lock  = NSLock()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {

                // ── URL attachment ──────────────────────────────────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            lock.lock()
                            if extractedURL == nil {
                                extractedURL = url.absoluteString
                                if extractedTitle == nil {
                                    extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                                }
                            }
                            lock.unlock()
                        }
                    }
                    continue
                }

                // ── Plain text (may embed a URL) ────────────────────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            lock.lock()
                            if extractedURL == nil {
                                extractedURL = url
                                if extractedTitle == nil { extractedTitle = text }
                            }
                            lock.unlock()
                        }
                    }
                    continue
                }

                // ── Image attachment (thumbnail for Vision extraction) ───────
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }

                        var image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL,
                                  let imgData = try? Data(contentsOf: url),
                                  let img = UIImage(data: imgData) {
                            image = img
                        }

                        if let img = image, let jpeg = self.compressImage(img) {
                            lock.lock()
                            if extractedImageData == nil { extractedImageData = jpeg }
                            lock.unlock()
                        }
                    }
                    continue
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

    // Compress an image to JPEG, rescaling if needed to stay under maxImageBytes.
    private func compressImage(_ image: UIImage) -> Data? {
        // Rescale to max 800px on the longest side to reduce storage size
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        // Try progressively lower quality until under size limit
        for quality: CGFloat in [0.6, 0.4, 0.25] {
            if let data = resized.jpegData(compressionQuality: quality), data.count <= maxImageBytes {
                return data
            }
        }
        return nil
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageData: Data?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        // Save image to App Group for the main app to read
        if let data = imageData {
            let base64 = data.base64EncodedString()
            savePendingShareToAppGroup(url: url, title: title, imageBase64: base64)
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        } else {
            savePendingShareToAppGroup(url: url, title: title, imageBase64: nil)
        }

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

        // Fallback path already handled by savePendingShareToAppGroup above
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let b64 = imageBase64 {
            defaults.set(b64,          forKey: "pendingShareImage")
            defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        } else {
            defaults.removeObject(forKey: "pendingShareImage")
            defaults.removeObject(forKey: "pendingShareImageMime")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
