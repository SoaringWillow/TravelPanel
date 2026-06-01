import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a shared item from the iOS Share Sheet and opens the main TravelPanel
// app with the travelpanel://share?url=...&title=... URL scheme.
//
// For Xiaohongshu / WeChat (which block server-side scraping), it also captures
// the shared image/screenshot and stores it as a compressed base64 JPEG in the
// App Group shared UserDefaults under "pendingShareImageData". The web app reads
// this key via @capacitor/preferences and passes it to /api/import for Claude Vision
// extraction instead of the blocked HTML scrape.
//
// Supported source types: URLs, plain text containing a URL, images/screenshots.

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
                            // Also look for an image sibling in the same item
                            self.captureImageIfPresent(from: attachments) { imageBase64 in
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
                            self.captureImageIfPresent(from: attachments) { imageBase64 in
                                self.openApp(url: url, title: text, imageBase64: imageBase64)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image / screenshot only (no URL found — common for Xiaohongshu
            // screenshots saved to camera roll, then shared into TravelPanel)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image = self.imageFromLoadedItem(data)
                        guard let img = image else { self.finish(); return }
                        let base64 = self.compressImage(img)
                        let title  = item.attributedTitle?.string ?? item.attributedContentText?.string ?? ""
                        self.saveImageToAppGroup(base64)
                        // Open app with a placeholder URL so the share page loads.
                        self.openApp(url: "travelpanel://image-clip", title: title, imageBase64: nil)
                    }
                    return
                }
            }
        }

        finish()
    }

    // ── Image helpers ──────────────────────────────────────────────────────────

    /// Look for an image attachment in the list and return it as a compressed base64 JPEG,
    /// without blocking the main continuation — calls completion on the main queue.
    private func captureImageIfPresent(
        from attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                guard let self else { completion(nil); return }
                if let img = self.imageFromLoadedItem(data) {
                    let base64 = self.compressImage(img)
                    self.saveImageToAppGroup(base64)
                    completion(base64)
                } else {
                    completion(nil)
                }
            }
            return
        }
        completion(nil)
    }

    private func imageFromLoadedItem(_ data: NSSecureCoding?) -> UIImage? {
        if let img = data as? UIImage { return img }
        if let url = data as? URL    { return UIImage(contentsOfFile: url.path) }
        if let raw = data as? Data   { return UIImage(data: raw) }
        return nil
    }

    /// Resize to max 800px on longest side, compress to JPEG 0.65, return base64.
    private func compressImage(_ image: UIImage) -> String {
        let maxDim: CGFloat = 800
        let scale   = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
        let newSize = CGSize(width: floor(image.size.width * scale),
                             height: floor(image.size.height * scale))

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        let data     = resized.jpegData(compressionQuality: 0.65) ?? Data()
        return data.base64EncodedString()
    }

    private func saveImageToAppGroup(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.synchronize()
    }

    // ── URL helpers ────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ───────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components        = URLComponents()
        components.scheme     = "travelpanel"
        components.host       = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group so the main app picks it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
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
