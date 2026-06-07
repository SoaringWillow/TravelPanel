import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image attachment is present alongside the URL (e.g. Xiaohongshu
// post thumbnails), the extension resizes it to 512px max, encodes it as
// JPEG base64, and stores it in the App Group so the CapacitorBridge can
// forward it to the enrichment API for Claude Vision extraction.
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

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.extractImageThenOpen(items: items, url: url.absoluteString, title: title)
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
                            self.extractImageThenOpen(items: items, url: url, title: text)
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

    // After finding the URL, scan all items for an image attachment.
    // Xiaohongshu and similar apps often include a post thumbnail or screenshot.
    private func extractImageThenOpen(items: [NSExtensionItem], url: String, title: String) {
        for item in items {
            for attachment in (item.attachments ?? []) {
                let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier,
                                  UTType.image.identifier, UTType.heic.identifier]
                for typeId in imageTypes {
                    if attachment.hasItemConformingToTypeIdentifier(typeId) {
                        attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                            guard let self else { return }
                            var image: UIImage?
                            if let fileURL = data as? URL {
                                image = UIImage(contentsOfFile: fileURL.path)
                            } else if let img = data as? UIImage {
                                image = img
                            } else if let imgData = data as? Data {
                                image = UIImage(data: imgData)
                            }

                            var imageBase64: String?
                            if let img = image,
                               let resized = img.resizedToMaxDimension(512),
                               let jpegData = resized.jpegData(compressionQuality: 0.65) {
                                imageBase64 = jpegData.base64EncodedString()
                            }

                            self.openApp(url: url, title: title, imageBase64: imageBase64)
                        }
                        return
                    }
                }
            }
        }
        // No image found — proceed without vision data
        openApp(url: url, title: title, imageBase64: nil)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        if let imageBase64 {
            saveToAppGroup(key: "pendingShareImage", value: imageBase64)
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
        saveToAppGroup(key: "pendingShareURL", value: url)
        saveToAppGroup(key: "pendingShareTitle", value: title)
        finish()
    }

    private func saveToAppGroup(key: String, value: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(value, forKey: key)
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}

// MARK: - UIImage resize helper

private extension UIImage {
    func resizedToMaxDimension(_ maxDim: CGFloat) -> UIImage? {
        let scale = min(maxDim / size.width, maxDim / size.height, 1.0)
        guard scale < 1.0 else { return self } // already small enough
        let newSize = CGSize(width: (size.width * scale).rounded(),
                             height: (size.height * scale).rounded())
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
