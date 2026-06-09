import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot/thumbnail image) from the iOS Share Sheet.
// Opens the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// optionally including hasImage=1 when a screenshot is captured.
//
// When an image is captured it is saved to the App Group as base64 JPEG.
// AppDelegate then injects it into the WebView's localStorage so the share page
// can pass it to Claude Vision — which enables extraction from anti-scraping
// platforms like Xiaohongshu and WeChat.

class ShareViewController: UIViewController {

    private let appGroup = "group.com.travelpanel.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Main extraction ────────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        // Collect all providers and the content title across all items
        var allProviders: [NSItemProvider] = []
        var contentTitle: String?
        for item in items {
            if let providers = item.attachments { allProviders.append(contentsOf: providers) }
            if contentTitle == nil { contentTitle = item.attributedContentText?.string }
        }

        let group = DispatchGroup()
        var foundURL: String?
        var foundImage: UIImage?

        // ── 1. Extract URL ─────────────────────────────────────────────────────

        if let urlProvider = allProviders.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            group.enter()
            urlProvider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL { foundURL = url.absoluteString }
                group.leave()
            }
        } else if let textProvider = allProviders.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            group.enter()
            textProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                if let text = data as? String {
                    if contentTitle == nil { contentTitle = text }
                    foundURL = self.extractURL(from: text)
                }
                group.leave()
            }
        }

        // ── 2. Extract image (screenshot or thumbnail) ─────────────────────────
        // Prefer JPEG > PNG > generic image. Some apps share a preview image
        // alongside the URL — this is the primary data source for Xiaohongshu.

        let imageTypeIDs = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
        if let imageProvider = imageTypeIDs.compactMap({ id in
            allProviders.first(where: { $0.hasItemConformingToTypeIdentifier(id) })
        }).first {
            let typeID = imageTypeIDs.first(where: { imageProvider.hasItemConformingToTypeIdentifier($0) }) ?? UTType.image.identifier
            group.enter()
            imageProvider.loadItem(forTypeIdentifier: typeID) { data, _ in
                if let image = data as? UIImage {
                    foundImage = image
                } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                    foundImage = image
                } else if let data = data as? Data, let image = UIImage(data: data) {
                    foundImage = image
                }
                group.leave()
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = foundURL else { self.finish(); return }

            let title = contentTitle ?? URL(string: url)?.host ?? ""
            let imageBase64 = foundImage.flatMap { self.compressImageToBase64($0) }
            self.openApp(url: url, title: title, imageBase64: imageBase64)
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first?.url?.absoluteString
    }

    /// Resize to max 800×800 and encode as JPEG at 70% quality (~30-60 KB).
    private func compressImageToBase64(_ image: UIImage) -> String? {
        let maxSide: CGFloat = 800
        let scale = min(maxSide / image.size.width, maxSide / image.size.height, 1.0)
        let targetSize = CGSize(width: floor(image.size.width * scale),
                                height: floor(image.size.height * scale))

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpeg = (resized ?? image).jpegData(compressionQuality: 0.7) else { return nil }
        return jpeg.base64EncodedString()
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Save everything to App Group before opening the URL scheme.
        // AppDelegate reads the image from App Group and injects it into localStorage.
        savePendingShare(url: url, title: title, imageBase64: imageBase64)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
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

        // Fallback: App Group write is already done above, app picks it up on next launch.
        finish()
    }

    private func savePendingShare(url: String, title: String, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let img = imageBase64 {
            defaults.set(img, forKey: "pendingShareImageBase64")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
