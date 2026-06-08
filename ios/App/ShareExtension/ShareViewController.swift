import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme.
// When an image is included (e.g. from Xiaohongshu where URLs are blocked by anti-scraping),
// the JPEG is compressed and stored in the App Group UserDefaults so the main app can
// pass it to the Claude Vision extraction endpoint.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

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

        var foundURL: String?
        var foundTitle: String?
        var foundImage: UIImage?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string

            for attachment in attachments {
                // Collect URLs
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = foundTitle ?? itemTitle ?? url.host
                        }
                    }
                }

                // Collect plain text (may contain a URL)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String {
                            if foundURL == nil, let extracted = self.extractURL(from: text) {
                                foundURL = extracted
                                foundTitle = foundTitle ?? itemTitle ?? text
                            }
                        }
                    }
                }

                // Collect images (Xiaohongshu screenshots, post covers)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let img = data as? UIImage, foundImage == nil {
                            foundImage = img
                        } else if let url = data as? URL,
                                  let data = try? Data(contentsOf: url),
                                  let img = UIImage(data: data),
                                  foundImage == nil {
                            foundImage = img
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) {
            guard let url = foundURL else {
                self.finish()
                return
            }
            // Save image to App Group if available
            if let image = foundImage {
                self.savePendingImage(image)
            }
            self.openApp(url: url, title: foundTitle ?? "", hasImage: foundImage != nil)
        }
    }

    // MARK: - Image storage

    private func savePendingImage(_ image: UIImage) {
        guard let compressed = compressImage(image, maxDimension: 768),
              let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        let base64 = compressed.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareImageType")
        defaults.synchronize()
    }

    private func compressImage(_ image: UIImage, maxDimension: CGFloat) -> Data? {
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(
            width: (image.size.width * scale).rounded(),
            height: (image.size.height * scale).rounded()
        )
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.75)
    }

    // MARK: - URL extraction

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - App open

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",      value: url),
            URLQueryItem(name: "title",    value: title),
            URLQueryItem(name: "hasImage", value: hasImage ? "1" : "0"),
        ]

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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
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
