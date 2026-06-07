import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + images) from the iOS Share Sheet and
// opens the main TravelPanel app via the travelpanel:// URL scheme.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
//
// Vision path (Xiaohongshu fix):
//   Xiaohongshu blocks server-side scraping, so the Share Extension extracts
//   the first shared image, compresses it to JPEG, and writes it to the App
//   Group so the web layer can pass it to Claude Vision for extraction.

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

        // Collect all attachments across items
        let allAttachments = items.compactMap { $0.attachments }.flatMap { $0 }
        let item = items.first

        // Try to extract a URL first; run image extraction in parallel
        var foundURL: String?
        var foundTitle: String?
        let group = DispatchGroup()

        // ── Priority 1: direct URL attachment ─────────────────────────────────
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL {
                        foundURL = url.absoluteString
                        foundTitle = item?.attributedContentText?.string ?? url.host ?? ""
                    }
                }
                break
            }
        }

        // ── Priority 2: plain text that may contain a URL ─────────────────────
        if foundURL == nil {
            for attachment in allAttachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            foundURL = url
                            foundTitle = text
                        }
                    }
                    break
                }
            }
        }

        // ── Image extraction (runs regardless of URL presence) ────────────────
        //   Captures the first image shared (post photo, screenshot, etc.)
        //   and stores it compressed in the App Group for the vision path.
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self else { return }
                    var image: UIImage?

                    if let imgData = data as? Data        { image = UIImage(data: imgData) }
                    else if let url = data as? URL        { image = UIImage(contentsOfFile: url.path) }
                    else if let img = data as? UIImage    { image = img }

                    if let image {
                        self.savePendingImageToAppGroup(image)
                    }
                }
                break // only first image
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            let url   = foundURL ?? ""
            let title = foundTitle ?? ""

            if !url.isEmpty {
                self.openApp(url: url, title: title)
            } else {
                // No URL found — app can still use the image alone (vision-only clip)
                self.openApp(url: "about:blank", title: title)
            }
        }
    }

    // ── Image compression & App Group write ────────────────────────────────────

    private func savePendingImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        // Downscale to max 1024px on the long side (sufficient for Claude Vision)
        let scaled = image.scaledDown(toMaxDimension: 1024)

        // Compress to JPEG; 0.7 quality keeps sufficient detail while staying small
        guard let jpegData = scaled.jpegData(compressionQuality: 0.7) else { return }

        let base64 = jpegData.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.set("image/jpeg", forKey: "pendingShareImageMediaType")
        defaults.synchronize()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        // Check whether there is a pending image to signal to the app
        let hasImage = UserDefaults(suiteName: "group.com.travelpanel.app")?
            .string(forKey: "pendingShareImageData") != nil

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

        // Open the main app via the responder chain (iOS 13+)
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

        // Fallback: write to App Group; main app reads on next launch
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

// ─── UIImage scaling helper ───────────────────────────────────────────────────

private extension UIImage {
    func scaledDown(toMaxDimension maxDim: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxDim else { return self }
        let scale = maxDim / longest
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in self.draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
