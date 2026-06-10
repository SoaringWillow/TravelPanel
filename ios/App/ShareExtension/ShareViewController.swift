import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Supported source types (priority order):
//   1. Direct URL attachments
//   2. Plain text containing a URL
//   3. Images / screenshots (for Xiaohongshu, WeChat, etc.)
//      — Compressed to ≤200 KB JPEG, passed as base64 via ?image= param.
//      — If the compressed image still exceeds URL-safe size (~1 MB),
//        it is stored in App Group UserDefaults (key: pendingShareImage)
//        and the URL scheme carries ?hasImage=1 instead.

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

            // Priority 3: image / screenshot (Xiaohongshu, WeChat, etc.)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    let title = item.attributedContentText?.string ?? "Travel screenshot"
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var image: UIImage?
                        if let url = data as? URL {
                            image = UIImage(contentsOfFile: url.path)
                        } else if let raw = data as? Data {
                            image = UIImage(data: raw)
                        } else if let img = data as? UIImage {
                            image = img
                        }
                        guard let img = image else { self.finish(); return }
                        self.openAppWithImage(img, title: title)
                    }
                    return
                }
            }
        }

        finish()
    }

    // MARK: — Image handling

    private func openAppWithImage(_ image: UIImage, title: String) {
        // Scale down large images before encoding (max 800 px on long side)
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / max(image.size.width, image.size.height), 1.0)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }

        // Compress to ≤ 200 KB JPEG
        let maxBytes = 200_000
        var quality: CGFloat = 0.82
        var imageData = resized.jpegData(compressionQuality: quality)
        while let d = imageData, d.count > maxBytes, quality > 0.10 {
            quality -= 0.15
            imageData = resized.jpegData(compressionQuality: quality)
        }
        guard let data = imageData else { finish(); return }

        let base64 = data.base64EncodedString()
        let safeTitle = title.isEmpty ? "Travel screenshot" : title

        // Build URL scheme. base64 of ≤200 KB ≈ ≤270 KB — safe for application.open().
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "image", value: base64),
            URLQueryItem(name: "title", value: safeTitle),
        ]

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                if let deepLink = components.url {
                    application.open(deepLink, options: [:]) { [weak self] success in
                        if !success {
                            // URL too long or app not running — fall back to App Group
                            self?.saveImageToAppGroup(base64: base64, title: safeTitle)
                        }
                        self?.finish()
                    }
                } else {
                    // URL construction failed (very rare) — use App Group
                    saveImageToAppGroup(base64: base64, title: safeTitle)
                    finish()
                }
                return
            }
            responder = r.next
        }

        // No UIApplication found in responder chain — use App Group fallback
        saveImageToAppGroup(base64: base64, title: safeTitle)
        finish()
    }

    private func saveImageToAppGroup(base64: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app with the deep link.
        // On iOS 13+, Share Extensions can open URLs via the responder chain.
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
        // See ios-setup.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.removeObject(forKey: "pendingShareImage") // clear any stale image
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
