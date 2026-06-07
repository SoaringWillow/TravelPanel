import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL
// scheme. When an image is also present (common with Xiaohongshu / WeChat
// which block URL scraping), it is compressed and written to the App Group
// so the main app can feed it to Claude Vision for extraction.

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

        // Walk all items and collect the first URL + first image found.
        // We process them independently so a single share with URL + image works.
        var collectedURL: String?
        var collectedTitle: String?
        var collectedImage: UIImage?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string ?? ""

            for attachment in attachments {
                // URL attachment
                if collectedURL == nil, attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            collectedURL = url.absoluteString
                            collectedTitle = itemTitle.isEmpty ? (url.host ?? "") : itemTitle
                        }
                    }
                }

                // Image attachment (UIImage or file URL to image)
                if collectedImage == nil, attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let image = data as? UIImage {
                            collectedImage = image
                        } else if let fileURL = data as? URL, let image = UIImage(contentsOfFile: fileURL.path) {
                            collectedImage = image
                        }
                    }
                }

                // Plain text fallback for URL extraction
                if collectedURL == nil, attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            collectedURL = url
                            collectedTitle = text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) {
            guard let url = collectedURL else {
                self.finish()
                return
            }
            // Save image to App Group if present
            let hasImage = collectedImage != nil
            if let image = collectedImage {
                self.saveImageToAppGroup(image)
            }
            self.openApp(url: url, title: collectedTitle ?? "", hasImage: hasImage)
        }
    }

    // MARK: - Image helpers

    /// Compress and store image as JPEG base64 in the shared App Group.
    /// Resized to max 1024px on the longest side to keep the payload small.
    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        let maxDimension: CGFloat = 1024
        let resized = resizeImage(image, maxDimension: maxDimension)

        guard let jpegData = resized.jpegData(compressionQuality: 0.72) else { return }
        let base64 = jpegData.base64EncodedString()

        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.set("image/jpeg", forKey: "pendingShareImageMimeType")
        defaults.synchronize()
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    // MARK: - URL helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - App launch

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

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

        // Fallback: write URL to App Group and let the main app pick it up on next launch
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
