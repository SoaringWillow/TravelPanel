import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot/thumbnail) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For anti-scraping platforms like Xiaohongshu and WeChat, the extension also
// captures the shared image, compresses it, and stores it in App Group Preferences
// so Claude Vision can extract content when server-side scraping fails.
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

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment (most social apps provide this)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            // Also try to capture a screenshot image alongside the URL
                            self.captureImageIfAvailable(from: attachments) { imageBase64, imageType in
                                self.openApp(url: url.absoluteString, title: title,
                                             imageBase64: imageBase64, imageMediaType: imageType)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 2: plain text that may contain a URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.captureImageIfAvailable(from: attachments) { imageBase64, imageType in
                                self.openApp(url: url, title: text,
                                             imageBase64: imageBase64, imageMediaType: imageType)
                            }
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

    // Tries to find an image attachment (screenshot/thumbnail) in the share items.
    // Resizes to max 800×800 and compresses to JPEG 0.55 quality to keep the
    // base64 payload within UserDefaults size limits (~100–150KB base64).
    private func captureImageIfAvailable(
        from attachments: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                    let image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                        image = img
                    } else {
                        image = nil
                    }

                    guard let raw = image else {
                        completion(nil, nil)
                        return
                    }

                    let resized = ShareViewController.resize(raw, maxDimension: 800)
                    guard let jpeg = resized.jpegData(compressionQuality: 0.55) else {
                        completion(nil, nil)
                        return
                    }
                    let base64 = jpeg.base64EncodedString()
                    completion(base64, "image/jpeg")
                }
                return
            }
        }
        completion(nil, nil)
    }

    private static func resize(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let scale = maxDimension / max(size.width, size.height)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?, imageMediaType: String?) {
        // Store image in App Group before opening the app (image too large for URL scheme)
        if let imageBase64 {
            saveImageToAppGroup(imageBase64: imageBase64, mediaType: imageMediaType ?? "image/jpeg")
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
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

    private func saveImageToAppGroup(imageBase64: String, mediaType: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(imageBase64, forKey: "pendingShareImageBase64")
        defaults.set(mediaType, forKey: "pendingShareImageType")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
