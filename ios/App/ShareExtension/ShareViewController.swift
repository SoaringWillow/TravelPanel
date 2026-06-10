import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet
// and opens the main TravelPanel app with:
//   travelpanel://share?url=...&title=...&hasImage=1
//
// When a preview image is available (common from Xiaohongshu / WeChat where
// the page URL is blocked by anti-scraping), it is written to the shared App
// Group as a JPEG base64 string under the key "pendingShareImage".  The web
// layer then reads that image and passes it to Claude Vision for extraction.

private let appGroupSuite = "group.com.travelpanel.app"
private let maxImageDimension: CGFloat = 1024
private let imageJpegQuality: CGFloat = 0.78

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Main extraction ──────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImage: UIImage?
        var urlFound = false
        var imageFound = false

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Priority 1 — direct URL attachment
                if !urlFound && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlFound = true
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            extractedURL   = url.absoluteString
                            extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }

                // Priority 2 — plain text containing a URL
                else if !urlFound && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    urlFound = true
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, let found = self.extractURL(from: text) {
                            extractedURL   = found
                            extractedTitle = text
                        }
                    }
                }

                // Also capture any preview image (runs in parallel with URL load)
                if !imageFound && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    imageFound = true
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let img = data as? UIImage {
                            extractedImage = img
                        } else if let fileURL = data as? URL,
                                  let img = UIImage(contentsOfFile: fileURL.path) {
                            extractedImage = img
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = extractedURL else {
                self.finish()
                return
            }

            var hasImage = false
            if let image = extractedImage {
                hasImage = self.saveImageToAppGroup(image)
            }

            self.openApp(url: url, title: extractedTitle ?? "", hasImage: hasImage)
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func saveImageToAppGroup(_ image: UIImage) -> Bool {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return false }

        let resized = image.tp_resized(toMaxDimension: maxImageDimension)
        guard let jpeg = resized.jpegData(compressionQuality: imageJpegQuality) else { return false }

        defaults.set(jpeg.base64EncodedString(), forKey: "pendingShareImage")
        defaults.synchronize()
        return true
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components        = URLComponents()
        components.scheme     = "travelpanel"
        components.host       = "share"
        var queryItems        = [
            URLQueryItem(name: "url",   value: url),
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

        // iOS 13+ — walk the responder chain to get UIApplication
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

        // Fallback: write to App Group for the main app to pick up on next launch
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url,            forKey: "pendingShareURL")
        defaults.set(title,          forKey: "pendingShareTitle")
        defaults.set(Date(),         forKey: "pendingShareDate")
        // pendingShareImage is already written by saveImageToAppGroup when hasImage is true
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}

// ── UIImage resize helper ────────────────────────────────────────────────────

private extension UIImage {
    func tp_resized(toMaxDimension maxDim: CGFloat) -> UIImage {
        let w = size.width, h = size.height
        guard w > maxDim || h > maxDim else { return self }
        let scale  = maxDim / max(w, h)
        let newSize = CGSize(width: (w * scale).rounded(), height: (h * scale).rounded())
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
