import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For platforms that block server-side HTML scraping (Xiaohongshu, WeChat, Douyin),
// the extension also captures the post screenshot so Claude Vision can analyze it
// directly instead of relying on the page HTML.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private var extractedURL: String?
    private var extractedTitle: String?
    private var extractedImage: UIImage?

    // Max dimension for the screenshot sent to Claude Vision (keeps base64 payload small)
    private let maxImageDimension: CGFloat = 1024

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
            let candidateTitle = item.attributedContentText?.string ?? ""

            for attachment in attachments {
                // Collect URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let url = data as? URL, self.extractedURL == nil {
                            self.extractedURL = url.absoluteString
                            if self.extractedTitle == nil, !candidateTitle.isEmpty {
                                self.extractedTitle = candidateTitle
                            }
                        }
                    }
                }

                // Collect plain text (may contain a short URL like xhslink.com/xxx)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, self.extractedURL == nil,
                           let url = self.extractURL(from: text) {
                            self.extractedURL = url
                            if self.extractedTitle == nil {
                                self.extractedTitle = text
                            }
                        }
                    }
                }

                // Collect screenshot / image (used when HTML scraping is blocked)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            image = nil
                        }
                        if let img = image, self.extractedImage == nil {
                            self.extractedImage = img
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = self.extractedURL else {
                self.finish()
                return
            }
            self.openApp(url: url, title: self.extractedTitle ?? "", image: self.extractedImage)
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func compressImage(_ image: UIImage) -> Data? {
        let size = image.size
        let scale = min(maxImageDimension / max(size.width, size.height), 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.7)
    }

    private func openApp(url: String, title: String, image: UIImage?) {
        // Save image to App Group prefs if we have one (before the URL scheme fires,
        // so the main app can read it synchronously on appUrlOpen)
        var hasImage = false
        if let image, let jpegData = compressImage(image) {
            let base64 = jpegData.base64EncodedString()
            if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(base64, forKey: "pendingShareImage")
                defaults.synchronize()
                hasImage = true
            }
        }

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

        // Open the main app with the deep link.
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

        // Fallback: write to App Group and let the main app pick it up on next launch
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
        DispatchGroup().notify(queue: .main) {} // flush any pending work
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
