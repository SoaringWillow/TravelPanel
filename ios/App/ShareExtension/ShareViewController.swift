import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives shared content from the iOS Share Sheet and opens the main TravelPanel
// app with a travelpanel://share?url=...&title=...&thumb=<base64jpeg> URL.
//
// Priority order:
//   1. URL attachment  (standard web share from most apps)
//   2. Image attachment (Xiaohongshu / WeChat posts that block URL scraping)
//   3. Plain text containing a URL
//
// When both a URL and an image are present (e.g. share from Xiaohongshu) both
// are forwarded: the API uses the URL for context and Claude Vision on the image
// to extract substance that URL scraping can't reach.
//
// The thumbnail is resized to 768×768 and JPEG-compressed before base64 encoding
// to keep the URL scheme payload under ~80 KB.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        // Collect all attachments across items
        var allAttachments: [NSItemProvider] = []
        var titleHint = ""
        for item in items {
            if let atts = item.attachments { allAttachments.append(contentsOf: atts) }
            if titleHint.isEmpty, let text = item.attributedContentText?.string { titleHint = text }
        }

        // Use a DispatchGroup so we can try URL + image in parallel, then open once.
        let group = DispatchGroup()
        var foundURL: String?
        var foundImageData: Data?

        for attachment in allAttachments {
            // URL
            if foundURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL { foundURL = url.absoluteString }
                }
            }

            // Image — captures Xiaohongshu/WeChat preview thumbnails
            if foundImageData == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL, let d = try? Data(contentsOf: url) {
                        foundImageData = d
                    } else if let img = data as? UIImage {
                        foundImageData = img.jpegData(compressionQuality: 0.7)
                    } else if let d = data as? Data {
                        foundImageData = d
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let url = foundURL {
                self.openApp(url: url, title: titleHint, imageData: foundImageData)
            } else if foundImageData != nil {
                // Image-only share (Xiaohongshu screenshot, etc.)
                self.openApp(url: "", title: titleHint.isEmpty ? "Travel inspiration" : titleHint, imageData: foundImageData)
            } else {
                // Fallback: look for a URL embedded in plain text
                self.tryPlainText(from: items)
            }
        }
    }

    private func tryPlainText(from items: [NSExtensionItem]) {
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.openApp(url: url, title: text, imageData: nil)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }
        finish()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resize image to maxDim × maxDim and re-compress as JPEG.
    // Keeps thumbnails under ~80 KB so the URL scheme stays manageable.
    private func resizeAndCompressImage(_ data: Data, maxDim: CGFloat = 768) -> Data? {
        guard let img = UIImage(data: data) else { return nil }
        let scale = min(maxDim / img.size.width, maxDim / img.size.height, 1.0)
        let newSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in img.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.72)
    }

    private func openApp(url: String, title: String, imageData: Data?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        if let rawData = imageData,
           let compressed = resizeAndCompressImage(rawData) {
            let base64 = compressed.base64EncodedString()
            queryItems.append(URLQueryItem(name: "thumb", value: base64))

            // Also write to App Group for the fallback path
            savePendingShareToAppGroup(url: url, title: title, imageBase64: base64)
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

        // Fallback: already written to App Group above
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String? = nil) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if let img = imageBase64 { defaults.set(img, forKey: "pendingShareImageBase64") }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
