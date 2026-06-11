import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/text/image) from the iOS Share Sheet
// and opens the main TravelPanel app with travelpanel://share?url=...&title=...
// which CapacitorBridge routes to /share.
//
// For anti-scraping platforms (Xiaohongshu, WeChat, Douyin) the post caption
// is stored in the App Group as `pendingShareText`, and the first post image
// is stored as a compressed JPEG base64 string in `pendingShareImageBase64`.
// The web app reads both and sends them to Claude Vision for richer extraction.
//
// Supported share types: URLs, plain text containing URLs, web pages.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        // Capture full caption/post text immediately (synchronous — it's in memory).
        // Xiaohongshu and other apps include the full post body here.
        let captionText = items.compactMap { $0.attributedContentText?.string }.first ?? ""
        if !captionText.isEmpty {
            saveToAppGroup(key: "pendingShareText", value: captionText)
        }

        // Start async image extraction in parallel with URL extraction.
        // The image will arrive after the URL but before the user taps "Save" in the app.
        extractImageToAppGroup(from: items)

        // Priority 1: direct URL attachment
        for item in items {
            guard let attachments = item.attachments else { continue }
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
        }

        // Priority 2: plain text that may contain a URL
        for item in items {
            guard let attachments = item.attachments else { continue }
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

    // ── Image extraction ──────────────────────────────────────────────────────
    //
    // Runs asynchronously alongside URL extraction. Stores a compressed JPEG
    // (≤ 512px, ≤ 200 KB) as a base64 string in the App Group. The web app
    // reads this after navigation and sends it to Claude Vision.

    private func extractImageToAppGroup(from items: [NSExtensionItem]) {
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var source: UIImage?
                        if let img = data as? UIImage {
                            source = img
                        } else if let url = data as? URL {
                            source = UIImage(contentsOfFile: url.path)
                        } else if let imgData = data as? Data {
                            source = UIImage(data: imgData)
                        }
                        if let img = source, let b64 = self.compressImageToBase64(img) {
                            self.saveToAppGroup(key: "pendingShareImageBase64", value: b64)
                        }
                    }
                    return // Only need the first image
                }
            }
        }
    }

    // Scale down to ≤512 px on longest side, then JPEG-compress.
    // Returns nil if the result would exceed 200 KB (to keep App Group small).
    private func compressImageToBase64(_ image: UIImage) -> String? {
        let maxDim: CGFloat = 512
        let w = image.size.width, h = image.size.height
        let scale = min(maxDim / w, maxDim / h, 1.0)
        let newSize = CGSize(width: w * scale, height: h * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpeg = resized?.jpegData(compressionQuality: 0.5) else { return nil }
        guard jpeg.count < 200_000 else { return nil } // Skip if > 200 KB after compression
        return jpeg.base64EncodedString()
    }

    // ── URL extraction ────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ──────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }

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

        // Fallback: the main app will pick this up on next launch
        saveToAppGroup(key: "pendingShareURL",   value: url)
        saveToAppGroup(key: "pendingShareTitle", value: title)
        saveToAppGroup(key: "pendingShareDate",  value: ISO8601DateFormatter().string(from: Date()))
        finish()
    }

    // ── App Group helpers ─────────────────────────────────────────────────────

    private func saveToAppGroup(key: String, value: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(value, forKey: key)
        defaults.synchronize()
    }

    // ── Finish ────────────────────────────────────────────────────────────────

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
