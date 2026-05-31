import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Image support: when a screenshot is included (e.g. sharing from Xiaohongshu or WeChat
// which block server-side scraping), the image is stored in the App Group as a base64 JPEG
// so the web layer can pass it to Claude Vision for extraction.
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
        var contentTitle = ""
        for item in items {
            if let attachments = item.attachments { allAttachments.append(contentsOf: attachments) }
            if let text = item.attributedContentText?.string, !text.isEmpty { contentTitle = text }
        }

        extractURL(from: allAttachments, title: contentTitle) { [weak self] urlString, title in
            guard let self else { return }
            guard let urlString else { self.finish(); return }
            // Try to extract an image alongside the URL (for anti-scrape platforms)
            self.extractImage(from: allAttachments) { imageBase64, mimeType in
                self.openApp(url: urlString, title: title, imageBase64: imageBase64, imageMimeType: mimeType)
            }
        }
    }

    private func extractURL(from attachments: [NSItemProvider], title: String, completion: @escaping (String?, String) -> Void) {
        // Priority 1: direct URL attachment
        for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    let t = title.isEmpty ? (url.host ?? "") : title
                    completion(url.absoluteString, t)
                } else {
                    completion(nil, "")
                }
            }
            return
        }

        // Priority 2: plain text that may contain a URL
        for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                if let text = data as? String, let url = self.extractURLString(from: text) {
                    completion(url, title.isEmpty ? text : title)
                } else {
                    completion(nil, "")
                }
            }
            return
        }

        completion(nil, "")
    }

    private func extractImage(from attachments: [NSItemProvider], completion: @escaping (String?, String?) -> Void) {
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]
        for type in imageTypes {
            for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(type) {
                attachment.loadItem(forTypeIdentifier: type) { data, _ in
                    var image: UIImage?
                    if let uiImage = data as? UIImage { image = uiImage }
                    else if let url = data as? URL, let d = try? Data(contentsOf: url) { image = UIImage(data: d) }
                    else if let d = data as? Data { image = UIImage(data: d) }

                    guard let img = image else { completion(nil, nil); return }

                    // Compress to JPEG at 0.6 quality and cap at ~800px — keeps base64 manageable
                    let maxDim: CGFloat = 800
                    let scale = min(maxDim / img.size.width, maxDim / img.size.height, 1.0)
                    let resized: UIImage
                    if scale < 1.0 {
                        let newSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
                        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
                        img.draw(in: CGRect(origin: .zero, size: newSize))
                        resized = UIGraphicsGetImageFromCurrentImageContext() ?? img
                        UIGraphicsEndImageContext()
                    } else {
                        resized = img
                    }

                    guard let jpeg = resized.jpegData(compressionQuality: 0.6) else {
                        completion(nil, nil); return
                    }
                    let base64 = jpeg.base64EncodedString()
                    completion(base64, "image/jpeg")
                }
                return
            }
        }
        completion(nil, nil)
    }

    private func extractURLString(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?, imageMimeType: String?) {
        // Always persist to App Group so AppDelegate can bridge to standard UserDefaults
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64, imageMimeType: imageMimeType)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }

        // Open the main app via URL scheme (iOS 13+, responder chain)
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

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?, imageMimeType: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if let b64 = imageBase64 { defaults.set(b64, forKey: "pendingShareImageBase64") }
        if let mime = imageMimeType { defaults.set(mime, forKey: "pendingShareImageMimeType") }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
