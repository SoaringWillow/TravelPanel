import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme.
//
// For Xiaohongshu and other anti-scraping platforms, the share sheet often provides
// an image preview. We capture it, encode as JPEG, and write it to the App Group so
// the app can pass it to Claude Vision for content extraction.
//
// Supported source types: URLs, plain text containing a URL, images, web pages.

class ShareViewController: UIViewController {

    private var pendingURL: String?
    private var pendingTitle: String?
    private var pendingImageBase64: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        guard let item = items.first, let attachments = item.attachments else {
            finish()
            return
        }

        let group = DispatchGroup()

        // Collect all attachment types concurrently, then decide what to do
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    if let url = data as? URL, self?.pendingURL == nil {
                        self?.pendingURL = url.absoluteString
                        if self?.pendingTitle == nil {
                            self?.pendingTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self else { return }
                    if let text = data as? String {
                        if self.pendingURL == nil, let extracted = self.extractURL(from: text) {
                            self.pendingURL = extracted
                        }
                        if self.pendingTitle == nil { self.pendingTitle = text }
                    }
                }
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self else { return }
                    var image: UIImage?
                    if let img = data as? UIImage { image = img }
                    else if let url = data as? URL { image = UIImage(contentsOfFile: url.path) }
                    if let image, let jpeg = self.compressImage(image) {
                        self.pendingImageBase64 = jpeg.base64EncodedString()
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = self.pendingURL {
                self.openApp(url: url, title: self.pendingTitle ?? "")
            } else if self.pendingImageBase64 != nil {
                // Image-only share (e.g. screenshot) — use a placeholder URL
                self.openApp(url: "travelpanel://image-share", title: self.pendingTitle ?? "Shared image")
            } else {
                self.finish()
            }
        }
    }

    // Resize to max 1024px and compress to JPEG to keep payload manageable
    private func compressImage(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 1024
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.75)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        // Always write to App Group — this is where imageBase64 travels (too large for URL scheme)
        savePendingShareToAppGroup(url: url, title: title)

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

        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let image = pendingImageBase64 {
            defaults.set(image, forKey: "pendingShareImageBase64")
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
