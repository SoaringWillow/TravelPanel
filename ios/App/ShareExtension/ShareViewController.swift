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
// Image extraction (for Xiaohongshu / WeChat posts that block URL scraping):
// - The image is resized to ≤800px and JPEG-compressed (quality 0.6)
// - Saved as base64 to the App Group under "pendingShareImage"
// - The deep link includes hasImage=1 so the app knows to read from App Group
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private let appGroupSuite = "group.com.travelpanel.app"
    private var extractedURL: String?
    private var extractedTitle: String?
    private var extractedImage: Data?

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // ── URL attachment (highest priority) ─────────────────────────────
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let url = data as? URL, self.extractedURL == nil {
                            self.extractedURL   = url.absoluteString
                            self.extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }
            }

            // ── Plain-text URL (fallback) ──────────────────────────────────────
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String,
                           let urlStr = self.extractURL(from: text),
                           self.extractedURL == nil {
                            self.extractedURL   = urlStr
                            self.extractedTitle = text
                        }
                    }
                }
            }

            // ── Image attachment (for Xiaohongshu / WeChat screenshot clips) ──
            for attachment in attachments {
                let imageTypes = [UTType.image.identifier, UTType.jpeg.identifier, UTType.png.identifier]
                for typeId in imageTypes {
                    if attachment.hasItemConformingToTypeIdentifier(typeId) {
                        group.enter()
                        attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                            defer { group.leave() }
                            guard let self, self.extractedImage == nil else { return }
                            if let fileURL = data as? URL,
                               let imgData = try? Data(contentsOf: fileURL) {
                                self.extractedImage = self.resizeImage(data: imgData)
                            } else if let imgData = data as? Data {
                                self.extractedImage = self.resizeImage(data: imgData)
                            }
                        }
                        break // one image is enough
                    }
                }
            }
        }

        // Wait for all extractions (with a 5s safety timeout) then open the app.
        let deadline = DispatchTime.now() + 5.0
        group.notify(queue: .main) { [weak self] in
            self?.complete()
        }
        DispatchQueue.global().asyncAfter(deadline: deadline) { [weak self] in
            self?.complete()
        }
    }

    private func complete() {
        guard let url = extractedURL else {
            finish()
            return
        }
        openApp(url: url, title: extractedTitle ?? "", imageData: extractedImage)
    }

    // ── URL extraction from plain text ────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Image resize + compress ───────────────────────────────────────────────
    // Keeps the image under ~200KB base64 (≈150KB binary) for App Group storage.

    private func resizeImage(data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let maxPx: CGFloat = 800
        let w = image.size.width, h = image.size.height
        let scale = min(maxPx / max(w, h), 1.0)
        let newSize = CGSize(width: w * scale, height: h * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        // Try JPEG quality 0.65; if still over 200KB try 0.4
        if let data = resized.jpegData(compressionQuality: 0.65), data.count <= 200_000 {
            return data
        }
        return resized.jpegData(compressionQuality: 0.4)
    }

    // ── Open main app ─────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageData: Data?) {
        // Persist to App Group (both for URL scheme + app-group fallback paths)
        saveToAppGroup(url: url, title: title, imageData: imageData)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"
        var queryItems    = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageData != nil {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else { finish(); return }

        // Traverse responder chain to find UIApplication and open the deep link.
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: data is already in App Group; app will pick it up on next focus.
        finish()
    }

    // ── App Group persistence ─────────────────────────────────────────────────

    private func saveToAppGroup(url: String, title: String, imageData: Data?) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let imageData {
            defaults.set(imageData.base64EncodedString(), forKey: "pendingShareImage")
            defaults.set("image/jpeg",                    forKey: "pendingShareImageType")
        } else {
            defaults.removeObject(forKey: "pendingShareImage")
            defaults.removeObject(forKey: "pendingShareImageType")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
