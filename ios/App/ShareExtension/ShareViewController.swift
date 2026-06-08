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
// Supported source types: URLs, plain text containing a URL, web pages,
// and images (screenshots from Xiaohongshu and similar anti-scraping platforms).
//
// Image flow: image → JPEG base64 → App Group → travelpanel://share?mode=screenshot
// The web app reads the image from App Group via @capacitor/preferences and
// sends it to /api/import which uses Claude Vision for extraction.

class ShareViewController: UIViewController {

    private let appGroupSuite = "group.com.travelpanel.app"
    private let maxImageDimension: CGFloat = 1024

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
            let itemTitle = item.attributedContentText?.string ?? ""

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = itemTitle.isEmpty ? (url.host ?? "") : itemTitle
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
                            self.openApp(url: url, title: itemTitle.isEmpty ? text : itemTitle)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image attachment (e.g. Xiaohongshu screenshot shared from Photos)
            // Page content cannot be fetched from Xiaohongshu due to anti-scraping,
            // so we store the image in App Group and use Claude Vision on the web side.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let image = data as? UIImage {
                            uiImage = image
                        } else if let url = data as? URL,
                                  let imageData = try? Data(contentsOf: url) {
                            uiImage = UIImage(data: imageData)
                        }
                        guard let image = uiImage else {
                            self.finish()
                            return
                        }
                        self.handleImageShare(image: image, title: itemTitle)
                    }
                    return
                }
            }
        }

        finish()
    }

    // ── Image share ──────────────────────────────────────────────────────────

    private func handleImageShare(image: UIImage, title: String) {
        let resized = resizeImage(image, maxDimension: maxImageDimension)
        guard let jpegData = resized.jpegData(compressionQuality: 0.82),
              let defaults = UserDefaults(suiteName: appGroupSuite) else {
            finish()
            return
        }

        let base64 = jpegData.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareMediaType")
        if !title.isEmpty {
            defaults.set(title, forKey: "pendingShareTitle")
        }
        defaults.synchronize()

        openAppInScreenshotMode(title: title)
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let scale = maxDimension / max(size.width, size.height)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    private func openAppInScreenshotMode(title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [URLQueryItem(name: "mode", value: "screenshot")]
        if !title.isEmpty {
            components.queryItems?.append(URLQueryItem(name: "title", value: title))
        }

        guard let deepLink = components.url else {
            finish()
            return
        }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }
        finish()
    }

    // ── URL share ────────────────────────────────────────────────────────────

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

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
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
