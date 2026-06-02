import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is available (e.g. from Xiaohongshu which blocks server-side
// scraping), the image is compressed and stored in the App Group UserDefaults
// under "pendingShareImageB64". The URL scheme carries hasImage=true so the
// web app knows to read and use it for Claude Vision extraction.
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

        // Use a DispatchGroup so we can collect URL + image concurrently across
        // all NSItemProvider attachments, then act once both are resolved.
        let group = DispatchGroup()
        var foundURL: String?
        var foundTitle: String?
        var foundImageB64: String?

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Collect URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                    continue
                }

                // Collect plain-text attachment (may contain a URL)
                if foundURL == nil, attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String,
                           let url = self?.extractURL(from: text),
                           foundURL == nil {
                            foundURL = url
                            foundTitle = text
                        }
                    }
                    continue
                }

                // Collect image attachment (preview / screenshot)
                if foundImageB64 == nil, attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        var image: UIImage?
                        if let url = data as? URL {
                            image = UIImage(contentsOfFile: url.path)
                        } else if let img = data as? UIImage {
                            image = img
                        }
                        if let img = image,
                           let jpeg = self?.compressImage(img, maxDimension: 512),
                           foundImageB64 == nil {
                            foundImageB64 = jpeg.base64EncodedString()
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = foundURL else {
                self.finish()
                return
            }
            if let imageB64 = foundImageB64 {
                self.savePendingImage(imageB64)
            }
            self.openApp(url: url, title: foundTitle ?? "", hasImage: foundImageB64 != nil)
        }
    }

    // MARK: - Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    /// Resize + JPEG-compress an image to a Claude-friendly thumbnail.
    private func compressImage(_ image: UIImage, maxDimension: CGFloat) -> Data? {
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.6)
    }

    /// Write the image to the App Group so CapacitorBridge can read it on next launch.
    private func savePendingImage(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageB64")
        defaults.synchronize()
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
            queryItems.append(URLQueryItem(name: "hasImage", value: "true"))
        }
        components.queryItems = queryItems

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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
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
