import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For Xiaohongshu and other anti-scrape platforms, also captures the
// preview image and stores it in the App Group container so the main
// app can forward it to Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images (screenshot / preview thumbnails shared alongside links).

class ShareViewController: UIViewController {

    // App Group identifier — must match the one in Xcode Signing & Capabilities.
    // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
    private let appGroupId = "group.com.travelpanel.app"

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
            allAttachments.append(contentsOf: item.attachments ?? [])
        }

        // Extract URL and image concurrently using a dispatch group
        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImage: UIImage?

        // ── Extract URL ───────────────────────────────────────────────────────

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

        // Fallback: plain text containing a URL
        if extractedURL == nil {
            for attachment in allAttachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String {
                            extractedURL = self.extractURL(from: text)
                            if extractedTitle == nil { extractedTitle = text }
                        }
                    }
                    break
                }
            }
        }

        // ── Extract image (for vision extraction on anti-scrape platforms) ───

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
                    } else if let data = data as? Data,
                              let image = UIImage(data: data) {
                        extractedImage = image
                    }
                }
                break
            }
        }

        // ── Wait for all extractions then open the app ────────────────────────

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            guard let url = extractedURL else {
                self.finish()
                return
            }

            // Save image to App Group if captured
            var hasImage = false
            if let image = extractedImage {
                hasImage = self.saveImageToAppGroup(image)
            }

            let title = extractedTitle ?? ""
            self.openApp(url: url, title: title, hasImage: hasImage)
        }
    }

    // ── Save image to shared App Group container ──────────────────────────────
    // Returns true if image was successfully saved.

    private func saveImageToAppGroup(_ image: UIImage) -> Bool {
        // Scale down large images to cap memory/transfer size (~720px wide max)
        let scaled = scaleImage(image, maxDimension: 720)
        guard let jpegData = scaled.jpegData(compressionQuality: 0.75) else { return false }

        // Write to App Group shared container
        guard let containerURL = FileManager.default
                .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return false
        }
        let fileURL = containerURL.appendingPathComponent("pendingShareImage.jpg")
        do {
            try jpegData.write(to: fileURL, options: .atomic)
            // Also store metadata
            if let defaults = UserDefaults(suiteName: appGroupId) {
                defaults.set(fileURL.path, forKey: "pendingShareImagePath")
                defaults.set(Date(), forKey: "pendingShareImageDate")
                defaults.synchronize()
            }
            return true
        } catch {
            return false
        }
    }

    private func scaleImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let scale = maxDimension / max(size.width, size.height)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

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

        // Also save URL/title to App Group as fallback (for when app is not running)
        savePendingShareToAppGroup(url: url, title: title)

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

        // Fallback: App Group already written above, app reads on next launch
        finish()
    }

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
