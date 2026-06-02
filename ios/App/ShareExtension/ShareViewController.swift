import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL or image from the iOS Share Sheet and opens the main
// TravelPanel app via the travelpanel:// URL scheme.
//
// Priority:
//   1. Direct URL attachment   → travelpanel://share?url=...&title=...
//   2. Plain text with URL     → same as above
//   3. Image attachment        → image stored in App Group, travelpanel://share?imageMode=1&title=...
//
// Supported source types: URLs, web pages, plain text, images (PNG/JPEG).

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

            // Priority 3: image attachment (for Xiaohongshu and other apps that block scraping)
            for attachment in attachments {
                let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
                if let matchedType = imageTypes.first(where: { attachment.hasItemConformingToTypeIdentifier($0) }) {
                    attachment.loadItem(forTypeIdentifier: matchedType) { [weak self] data, _ in
                        guard let self else { return }
                        let title = item.attributedContentText?.string ?? ""
                        if let image = data as? UIImage {
                            self.openAppWithImage(image, title: title)
                        } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                            self.openAppWithImage(image, title: title)
                        } else {
                            // Can't read image — fall back to title-only save
                            self.openApp(url: "", title: title)
                        }
                    }
                    return
                }
            }
        }

        finish()
    }

    // ── Image handling ─────────────────────────────────────────────────────

    private func openAppWithImage(_ image: UIImage, title: String) {
        // Resize to max 1024px on the long edge and compress as JPEG.
        // This keeps the base64 size under ~200KB — safe for UserDefaults.
        let maxDimension: CGFloat = 1024
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard
            let resized,
            let jpegData = resized.jpegData(compressionQuality: 0.6)
        else {
            openApp(url: "", title: title)
            return
        }

        let base64 = jpegData.base64EncodedString()
        savePendingImageToAppGroup(base64: base64, mimeType: "image/jpeg", title: title)

        // Open app in image mode
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "imageMode", value: "1"),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }
        openDeepLink(deepLink)
    }

    // ── URL handling ───────────────────────────────────────────────────────

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [URLQueryItem(name: "title", value: title)]
        if !url.isEmpty {
            queryItems.insert(URLQueryItem(name: "url", value: url), at: 0)
        } else {
            queryItems.append(URLQueryItem(name: "imageMode", value: "1"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else { finish(); return }
        openDeepLink(deepLink)
    }

    private func openDeepLink(_ deepLink: URL) {
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }
        // Fallback: save pending data and let app pick it up on next launch
        finish()
    }

    // ── App Group persistence ──────────────────────────────────────────────

    private func savePendingImageToAppGroup(base64: String, mimeType: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.set(mimeType, forKey: "pendingShareImageMime")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // ── Utilities ──────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
