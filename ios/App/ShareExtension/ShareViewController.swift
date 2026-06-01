import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers
import ImageIO

// TravelPanel Share Extension
//
// Receives a URL (and optional title/image) from the iOS Share Sheet and opens
// the main TravelPanel app via the travelpanel:// URL scheme.
//
// Supported source types:
//   • URLs (web links, social post links)
//   • Plain text containing a URL
//   • Images / screenshots (for Xiaohongshu, WeChat — anti-scraping fallback)
//
// Image flow (B3):
//   1. Resize to max 1024px, compress to JPEG 75%
//   2. Write base64 to App Group shared container
//   3. Open main app with travelpanel://share?hasImage=true[&url=...]
//   4. AppDelegate bridges image from App Group → standard UserDefaults
//   5. CapacitorBridge reads it and routes to the vision-import API

private let appGroupId = "group.com.travelpanel.app"

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Main dispatch ─────────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // We collect URL and image in parallel, then decide which path to take.
        var foundURL: String? = nil
        var foundTitle: String? = nil
        var foundImage: UIImage? = nil

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }
                // Image attachment (screenshots, saved photos)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if foundImage != nil { return }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            foundImage = img
                        } else if let data = data as? Data, let img = UIImage(data: data) {
                            foundImage = img
                        }
                    }
                }
                // Plain text (may contain a URL)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if foundURL != nil { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            foundURL = url
                            foundTitle = text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let image = foundImage {
                // Image share path: vision extraction
                self.openAppWithImage(image, url: foundURL, title: foundTitle)
            } else if let url = foundURL {
                // URL share path: standard extraction
                self.openApp(url: url, title: foundTitle ?? "")
            } else {
                self.finish()
            }
        }
    }

    // ── URL share path ────────────────────────────────────────────────────────

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

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    // ── Image share path (B3) ─────────────────────────────────────────────────

    private func openAppWithImage(_ image: UIImage, url: String?, title: String?) {
        guard let base64 = compressAndEncode(image) else {
            // Fall back to URL-only if image encoding fails
            if let url = url { openApp(url: url, title: title ?? ""); return }
            finish()
            return
        }

        // Write image data to App Group so AppDelegate can bridge it to the web layer
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(base64, forKey: "pendingShareImage")
            defaults.set("image/jpeg", forKey: "pendingShareImageMime")
            if let url = url { defaults.set(url, forKey: "pendingShareImageURL") }
            if let title = title { defaults.set(title, forKey: "pendingShareImageTitle") }
            defaults.synchronize()
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems: [URLQueryItem] = [URLQueryItem(name: "hasImage", value: "true")]
        if let url = url { queryItems.append(URLQueryItem(name: "url", value: url)) }
        if let title = title { queryItems.append(URLQueryItem(name: "title", value: title)) }
        components.queryItems = queryItems

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: image already in App Group, app reads it on next launch
        finish()
    }

    // Resize to max 1024px on the longer side and compress to JPEG 75%.
    // Keeps the base64 payload under ~200KB for typical screenshots.
    private func compressAndEncode(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 1024
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.75) else { return nil }
        return jpegData.base64EncodedString()
    }

    // ── App Group fallback (URL path) ─────────────────────────────────────────

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
