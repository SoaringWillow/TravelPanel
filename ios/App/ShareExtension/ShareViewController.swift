import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Supported source types: URLs, plain text containing a URL, web pages.
// When an image is included (e.g. from Xiaohongshu), it is stored as JPEG in
// App Group storage so the main app can pass it to Claude Vision for extraction.

private let appGroupSuite = "group.com.travelpanel.app"
private let maxImageBytes = 1_000_000 // 1 MB JPEG target for Claude Vision

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
                            self.extractImageThenOpen(attachments: attachments, url: url.absoluteString, title: title)
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
                            self.extractImageThenOpen(attachments: attachments, url: url, title: text)
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

    // Tries to find an image attachment alongside the URL; falls back without image.
    private func extractImageThenOpen(attachments: [NSItemProvider], url: String, title: String) {
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
        for attachment in attachments {
            for typeId in imageTypes {
                if attachment.hasItemConformingToTypeIdentifier(typeId) {
                    attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                        guard let self else { return }
                        var image: UIImage?
                        if let img = data as? UIImage { image = img }
                        else if let d = data as? Data { image = UIImage(data: d) }
                        else if let fileURL = data as? URL, let d = try? Data(contentsOf: fileURL) { image = UIImage(data: d) }

                        if let image {
                            self.storeImage(image)
                            self.openApp(url: url, title: title, hasImage: true)
                        } else {
                            self.openApp(url: url, title: title, hasImage: false)
                        }
                    }
                    return
                }
            }
        }
        // No image attachment found
        openApp(url: url, title: title, hasImage: false)
    }

    // Encodes the image as JPEG (≤ 1 MB) and saves to App Group storage.
    private func storeImage(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }

        var quality: CGFloat = 0.85
        var data = image.jpegData(compressionQuality: quality)

        // Progressively compress until under the size limit
        while let d = data, d.count > maxImageBytes, quality > 0.1 {
            quality = max(quality - 0.2, 0.1)
            let scale = sqrt(Double(maxImageBytes) / Double(d.count))
            let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            let resized = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            data = resized?.jpegData(compressionQuality: quality)
        }

        guard let jpeg = data else { return }
        defaults.set(jpeg, forKey: "pendingShareImageData")
        defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        defaults.synchronize()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
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
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app via responder chain (works on iOS 13+).
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
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(hasImage, forKey: "pendingShareHasImage")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
