import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// Image payloads (e.g. screenshots from Xiaohongshu/WeChat) are written to the
// shared App Group under "pendingShareImage" so Claude Vision can analyse them.
// The image is too large to embed in a URL query param — CapacitorBridge reads it
// from App Group separately and passes it to the enrichment API.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private var capturedImageBase64: String? = nil
    private let appGroupSuite = "group.com.travelpanel.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // Collects URL + optional image from all attachments, then opens the app.
    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Gather all attachments from all extension items
        var allAttachments: [NSItemProvider] = []
        for item in items {
            allAttachments += item.attachments ?? []
        }

        let group = DispatchGroup()
        var foundURL: String? = nil
        var foundTitle: String? = nil

        // ── Pass 1: extract URL ──────────────────────────────────────────────
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL, foundURL == nil {
                        foundURL = url.absoluteString
                        // Try to pick up a human-readable title from the extension item
                        if let item = (self.extensionContext?.inputItems as? [NSExtensionItem])?.first {
                            foundTitle = item.attributedContentText?.string
                        }
                    }
                }
                break // one URL is enough
            }
        }

        // ── Pass 1b: plain-text URL fallback ────────────────────────────────
        if foundURL == nil {
            for attachment in allAttachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String, foundURL == nil {
                            foundURL = self.extractURL(from: text)
                            foundTitle = text
                        }
                    }
                    break
                }
            }
        }

        // ── Pass 2: capture image (for Xiaohongshu/WeChat visual extraction) ──
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self = self, self.capturedImageBase64 == nil else { return }
                    var uiImage: UIImage? = nil
                    if let img = data as? UIImage {
                        uiImage = img
                    } else if let raw = data as? Data {
                        uiImage = UIImage(data: raw)
                    } else if let fileURL = data as? URL, let raw = try? Data(contentsOf: fileURL) {
                        uiImage = UIImage(data: raw)
                    }
                    if let img = uiImage {
                        // Resize to ≤1024px and compress to keep App Group payload manageable.
                        let resized = self.resizeImage(img, maxDimension: 1024)
                        self.capturedImageBase64 = resized.jpegData(compressionQuality: 0.7)?
                            .base64EncodedString()
                    }
                }
                break // one image is sufficient
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "")
            } else {
                self.finish()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resizes an image so neither dimension exceeds maxDimension.
    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    private func openApp(url: String, title: String) {
        // Write image to App Group *before* opening the URL scheme so
        // CapacitorBridge can read it when the app becomes active.
        if let image = capturedImageBase64 {
            savePendingImageToAppGroup(imageBase64: image)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            savePendingShareToAppGroup(url: url, title: title)
            finish()
            return
        }

        // Open the main app via the responder chain (iOS 13+).
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] success in
                    if !success {
                        // App couldn't be opened — fall back to App Group
                        self?.savePendingShareToAppGroup(url: url, title: title)
                    }
                    self?.finish()
                }
                return
            }
            responder = r.next
        }

        // Responder chain fallback: write everything to App Group
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

    private func savePendingImageToAppGroup(imageBase64: String) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(imageBase64, forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
