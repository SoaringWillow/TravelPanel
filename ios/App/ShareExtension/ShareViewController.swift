import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// For anti-scraping platforms (Xiaohongshu, WeChat), the extension also captures
// any image attachment, compresses it, and saves it to the shared App Group so
// Claude Vision can extract content when the URL fetch is blocked server-side.
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

        // Step 1: scan all attachments for an image and save it to the App Group.
        // This is fire-and-forget; URL extraction proceeds in parallel below.
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        self?.saveImageToAppGroup(data: data)
                    }
                    break
                }
            }
        }

        // Step 2: URL extraction (same priority order as before).
        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.openApp(url: url.absoluteString, title: title)
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
                            self.openApp(url: url, title: text)
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

    // ─── Image handling ──────────────────────────────────────────────────────

    private func saveImageToAppGroup(data: NSSecureCoding?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        var rawImage: UIImage?

        if let image = data as? UIImage {
            rawImage = image
        } else if let url = data as? URL, let imgData = try? Data(contentsOf: url) {
            rawImage = UIImage(data: imgData)
        } else if let imgData = data as? Data {
            rawImage = UIImage(data: imgData)
        }

        guard let image = rawImage,
              let jpegData = compressImage(image) else { return }

        defaults.set(jpegData.base64EncodedString(), forKey: "pendingShareImageBase64")
        defaults.synchronize()
    }

    // Resize to at most 768 × 768 px and compress to JPEG 0.75 quality.
    // This keeps base64 payloads around 100–200 KB — well within Claude's limits.
    private func compressImage(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 768
        let size = image.size
        let scale: CGFloat

        if size.width > maxDimension || size.height > maxDimension {
            scale = maxDimension / max(size.width, size.height)
        } else {
            scale = 1.0
        }

        let newSize = CGSize(width: (size.width * scale).rounded(),
                             height: (size.height * scale).rounded())

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.75)
    }

    // ─── URL extraction ──────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ─── App open ────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String) {
        let hasImage = UserDefaults(suiteName: "group.com.travelpanel.app")?
            .string(forKey: "pendingShareImageBase64") != nil

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "true"))
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // pendingShareImageBase64 is already set by saveImageToAppGroup if an image was found.
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
