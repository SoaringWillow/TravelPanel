import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is present (e.g. Xiaohongshu screenshots), it is saved to
// App Group storage as pendingShareImageBase64. CapacitorBridge reads it on
// app activation, stores it in sessionStorage, and the /share page passes it
// to the enrichment API for Claude Vision extraction.
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

        // Collect all attachments across all items
        var allAttachments: [NSItemProvider] = []
        for item in items {
            allAttachments.append(contentsOf: item.attachments ?? [])
        }

        // Try to extract URL first, then image, in parallel groups
        extractURL(from: items, allAttachments: allAttachments) { [weak self] url, title in
            guard let self else { return }
            if let url {
                // Concurrently check for an image attachment
                self.extractFirstImage(from: allAttachments) { imageBase64, mimeType in
                    if let imageBase64 {
                        self.savePendingImage(base64: imageBase64, mimeType: mimeType ?? "image/jpeg")
                    }
                    self.openApp(url: url, title: title ?? "")
                }
            } else {
                self.finish()
            }
        }
    }

    // MARK: - URL extraction

    private func extractURL(
        from items: [NSExtensionItem],
        allAttachments: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        // Priority 1: direct URL attachment
        for item in items {
            for attachment in item.attachments ?? [] {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            completion(url.absoluteString, title)
                        } else {
                            completion(nil, nil)
                        }
                    }
                    return
                }
            }
        }

        // Priority 2: plain text that may contain a URL
        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                    if let text = data as? String, let url = self.extractURLString(from: text) {
                        completion(url, text)
                    } else {
                        completion(nil, nil)
                    }
                }
                return
            }
        }

        completion(nil, nil)
    }

    private func extractURLString(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - Image extraction

    private func extractFirstImage(
        from attachments: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        let imageTypes: [String] = [
            UTType.jpeg.identifier,
            UTType.png.identifier,
            UTType.image.identifier,
            "public.jpeg",
            "public.png",
        ]

        for attachment in attachments {
            for typeId in imageTypes {
                if attachment.hasItemConformingToTypeIdentifier(typeId) {
                    attachment.loadItem(forTypeIdentifier: typeId) { data, _ in
                        guard let image = self.imageFrom(data: data) else {
                            completion(nil, nil)
                            return
                        }
                        // Compress to JPEG — max 512 KB to stay under API limits
                        let compressed = self.compressJPEG(image, maxBytes: 512 * 1024)
                        let base64 = compressed?.base64EncodedString()
                        completion(base64, "image/jpeg")
                    }
                    return
                }
            }
        }

        completion(nil, nil)
    }

    private func imageFrom(data: NSSecureCoding?) -> UIImage? {
        if let image = data as? UIImage { return image }
        if let url   = data as? URL,
           let imageData = try? Data(contentsOf: url) { return UIImage(data: imageData) }
        if let imageData = data as? Data { return UIImage(data: imageData) }
        return nil
    }

    private func compressJPEG(_ image: UIImage, maxBytes: Int) -> Data? {
        // Scale down if very large (max 1280px on longest side)
        let maxDim: CGFloat = 1280
        let size    = image.size
        let longest = max(size.width, size.height)
        let scaled: UIImage
        if longest > maxDim {
            let scale  = maxDim / longest
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            scaled = UIGraphicsGetImageFromCurrentImageContext() ?? image
            UIGraphicsEndImageContext()
        } else {
            scaled = image
        }

        var quality: CGFloat = 0.82
        var data = scaled.jpegData(compressionQuality: quality)
        while let d = data, d.count > maxBytes, quality > 0.3 {
            quality -= 0.1
            data = scaled.jpegData(compressionQuality: quality)
        }
        return data
    }

    // MARK: - App Group storage

    private func savePendingImage(base64: String, mimeType: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.set(mimeType, forKey: "pendingShareImageMimeType")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // MARK: - Open app

    private func openApp(url: String, title: String) {
        var components        = URLComponents()
        components.scheme     = "travelpanel"
        components.host       = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
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

        // Fallback: write URL to App Group so the main app picks it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
