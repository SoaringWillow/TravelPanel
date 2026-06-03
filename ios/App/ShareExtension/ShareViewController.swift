import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For platforms that block scraping (Xiaohongshu, WeChat), the extension also
// captures any shared image/screenshot, resizes it, and saves it to the App Group
// shared container so the web layer can pass it to Claude Vision.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private let appGroupId = "group.com.travelpanel.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Collect all attachments across all items
        let allAttachments = items.flatMap { $0.attachments ?? [] }

        // Priority 1: a direct URL attachment
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let url = data as? URL {
                        let title = items.first?.attributedContentText?.string ?? url.host ?? ""
                        // Also try to extract any image in parallel
                        self.extractImageIfAvailable(from: allAttachments) { _ in }
                        self.openApp(url: url.absoluteString, title: title)
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
                    if let text = data as? String, let url = self.extractURL(from: text) {
                        self.extractImageIfAvailable(from: allAttachments) { _ in }
                        self.openApp(url: url, title: text)
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        // Priority 3: image only (screenshot shared without a URL — use Vision for everything)
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    let image = self.imageFrom(data: data)
                    if let image, let b64 = self.compressAndEncode(image) {
                        self.saveImageToAppGroup(base64: b64, mime: "image/jpeg")
                    }
                    // Fall back to a placeholder URL so the share page still opens
                    self.openApp(url: "about:blank", title: "Screenshot", hasImage: image != nil)
                }
                return
            }
        }

        finish()
    }

    // ── Image helpers ─────────────────────────────────────────────────────────

    private func extractImageIfAvailable(from attachments: [NSItemProvider], completion: @escaping (Bool) -> Void) {
        guard let attachment = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
        }) else {
            completion(false)
            return
        }

        attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
            guard let self else { completion(false); return }
            let image = self.imageFrom(data: data)
            if let image, let b64 = self.compressAndEncode(image) {
                self.saveImageToAppGroup(base64: b64, mime: "image/jpeg")
                completion(true)
            } else {
                completion(false)
            }
        }
    }

    private func imageFrom(data: NSSecureCoding?) -> UIImage? {
        if let image = data as? UIImage { return image }
        if let url = data as? URL, let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        if let data = data as? Data { return UIImage(data: data) }
        return nil
    }

    // Resize to max 800px on the longest edge and compress to JPEG ~80%.
    // Keeps the payload well under 1 MB so App Group UserDefaults stays fast.
    private func compressAndEncode(_ image: UIImage) -> String? {
        let maxDim: CGFloat = 800
        let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        guard let jpeg = resized.jpegData(compressionQuality: 0.8) else { return nil }
        return jpeg.base64EncodedString()
    }

    private func saveImageToAppGroup(base64: String, mime: String) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set(mime, forKey: "pendingShareImageMime")
        defaults.synchronize()
    }

    // ── URL helpers ───────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

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

        // Fallback: write URL to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
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
