import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot image) from the iOS Share Sheet
// and opens the main TravelPanel app with:
//   travelpanel://share?url=...&title=...&hasImage=true
//
// The image (if any) is saved to the shared App Group UserDefaults as a base64
// JPEG string before the URL scheme fires, so the main app can pass it to
// Claude Vision for extraction — bypassing anti-scraping on Xiaohongshu / WeChat.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private var pendingURL:         String = ""
    private var pendingTitle:       String = ""
    private var pendingImageBase64: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Extraction ─────────────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem],
              !items.isEmpty else {
            finish()
            return
        }

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1 — URL
            for attachment in attachments where pendingURL.isEmpty {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self, self.pendingURL.isEmpty else { return }
                        if let url = data as? URL {
                            self.pendingURL   = url.absoluteString
                            self.pendingTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                    break
                }
            }

            // Priority 2 — Image (screenshot or photo shared alongside the post)
            for attachment in attachments where pendingImageBase64.isEmpty {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        var image: UIImage?
                        if let uiImage = data as? UIImage {
                            image = uiImage
                        } else if let raw = data as? Data {
                            image = UIImage(data: raw)
                        } else if let fileURL = data as? URL {
                            image = UIImage(contentsOfFile: fileURL.path)
                        }
                        if let image {
                            self.pendingImageBase64 = self.encodeImage(image)
                        }
                    }
                    break
                }
            }

            // Priority 3 — Plain text that may contain a URL
            for attachment in attachments where pendingURL.isEmpty {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self, self.pendingURL.isEmpty else { return }
                        if let text = data as? String,
                           let extracted = self.extractURL(from: text) {
                            self.pendingURL   = extracted
                            self.pendingTitle = text
                        }
                    }
                    break
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard !self.pendingURL.isEmpty else { self.finish(); return }
            self.openApp(url: self.pendingURL, title: self.pendingTitle)
        }
    }

    // ── Image encoding ─────────────────────────────────────────────────────────

    // Resize to max 800px on the longest side, encode as JPEG at 75% quality.
    // Typical output: 50–150 KB base64 — well within App Group 4 MB UserDefaults limit.
    private func encodeImage(_ image: UIImage) -> String {
        let maxDimension: CGFloat = 800
        let size  = image.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        let target = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: target)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }

        guard let jpegData = resized.jpegData(compressionQuality: 0.75) else { return "" }
        return jpegData.base64EncodedString()
    }

    // ── URL extraction from plain text ─────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range    = NSRange(text.startIndex..., in: text)
        return detector?.matches(in: text, options: [], range: range)
            .first.flatMap { $0.url?.absoluteString }
    }

    // ── Deep link open ──────────────────────────────────────────────────────────

    private func openApp(url: String, title: String) {
        // Write image to App Group BEFORE firing the URL scheme so the main app
        // can retrieve it via AppGroupPlugin.readPendingImage().
        if !pendingImageBase64.isEmpty,
           let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
            defaults.set(pendingImageBase64, forKey: "pendingShareImageBase64")
            defaults.synchronize()
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"
        var items: [URLQueryItem] = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if !pendingImageBase64.isEmpty {
            items.append(URLQueryItem(name: "hasImage", value: "true"))
        }
        components.queryItems = items

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group for next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    // ── App Group fallback storage ──────────────────────────────────────────────

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,    forKey: "pendingShareURL")
        defaults.set(title,  forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // ── Finish ──────────────────────────────────────────────────────────────────

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
