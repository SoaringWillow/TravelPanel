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
// images (screenshots from Xiaohongshu and other anti-scraping platforms).
//
// When an image is found alongside a URL, the image is saved to the App Group
// shared container as shareImage.jpg so the main app can pass it to Claude Vision.

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

        // Collect all attachments across all extension items
        var allAttachments: [NSItemProvider] = []
        for item in items {
            allAttachments += item.attachments ?? []
        }

        let title = (items.first?.attributedContentText?.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        // Extract URL and image in parallel using a dispatch group
        let group = DispatchGroup()
        var extractedURL: String?
        var extractedImage: UIImage?

        // ── Look for a URL ────────────────────────────────────────────────────

        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL {
                        extractedURL = url.absoluteString
                    }
                }
                break
            }
        }

        // ── Look for a URL in plain text ──────────────────────────────────────

        if extractedURL == nil {
            for attachment in allAttachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            extractedURL = url
                        }
                    }
                    break
                }
            }
        }

        // ── Look for an image (screenshots from XHS, WeChat, etc.) ───────────

        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                    defer { group.leave() }
                    if let image = data as? UIImage {
                        extractedImage = image
                    } else if let url = data as? URL,
                              let data = try? Data(contentsOf: url),
                              let image = UIImage(data: data) {
                        extractedImage = image
                    }
                }
                break
            }
        }

        // ── Wait for all extractions, then open the app ───────────────────────

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Save image to App Group container for the main app to read
            if let image = extractedImage {
                self.saveImageToAppGroup(image)
            }

            let finalURL = extractedURL ?? (extractedImage != nil ? "travelpanel://screenshot" : "")
            if finalURL.isEmpty {
                self.finish()
                return
            }

            self.openApp(url: finalURL, title: title, hasImage: extractedImage != nil)
        }
    }

    // ── Image handling ────────────────────────────────────────────────────────

    private func saveImageToAppGroup(_ image: UIImage) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.travelpanel.app"
        ) else { return }

        let resized = resizeImage(image, maxDimension: 1024)
        guard let jpeg = resized.jpegData(compressionQuality: 0.72) else { return }

        let fileURL = containerURL.appendingPathComponent("shareImage.jpg")
        try? jpeg.write(to: fileURL, options: .atomic)

        if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
            defaults.set(true, forKey: "pendingShareHasImage")
            defaults.synchronize()
        }
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        guard scale < 1.0 else { return image }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    // ── URL extraction ────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ─────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
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

        // Fallback: write URL to App Group so the main app picks it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
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
