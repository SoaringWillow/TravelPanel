import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&imageB64=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Image capture is used for platforms that block URL scraping (Xiaohongshu, WeChat,
// Douyin). When an image is present, the web layer uses Claude Vision instead of
// page scraping to extract locations and substance.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // Maximum image dimension (px) before JPEG encode — keeps the URL scheme payload small
    private let maxImageDimension: CGFloat = 480
    private let imageJpegQuality: CGFloat = 0.45

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var sharedURL: String?
        var sharedTitle: String?
        var sharedImage: UIImage?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let contentTitle = item.attributedContentText?.string ?? ""

            for attachment in attachments {
                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, sharedURL == nil {
                            sharedURL = url.absoluteString
                            if sharedTitle == nil { sharedTitle = contentTitle.isEmpty ? url.host : contentTitle }
                        }
                    }
                }

                // Plain text (may contain a URL — e.g. Xiaohongshu share text)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String, let url = self?.extractURL(from: text), sharedURL == nil {
                            sharedURL = url
                            if sharedTitle == nil { sharedTitle = text }
                        }
                    }
                }

                // Image attachment (e.g. Xiaohongshu post screenshot)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if sharedImage != nil { return }
                        if let image = data as? UIImage {
                            sharedImage = image
                        } else if let fileURL = data as? URL,
                                  let imageData = try? Data(contentsOf: fileURL) {
                            sharedImage = UIImage(data: imageData)
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = sharedURL {
                self.openApp(url: url, title: sharedTitle ?? "", image: sharedImage)
            } else {
                self.finish()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resize and JPEG-encode an image for inline transfer via URL scheme.
    // Keeps the payload under ~80 KB (base64) for reliable deep-link handling.
    private func encodeImage(_ image: UIImage) -> String? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }

        let scale = min(maxImageDimension / size.width, maxImageDimension / size.height, 1.0)
        let newSize = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: imageJpegQuality) else { return nil }
        // If still too large, reduce quality further
        if jpegData.count > 120_000,
           let smallerData = resized.jpegData(compressionQuality: 0.25) {
            return smallerData.base64EncodedString()
        }
        return jpegData.base64EncodedString()
    }

    private func openApp(url: String, title: String, image: UIImage? = nil) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"

        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        if let image, let b64 = encodeImage(image) {
            queryItems.append(URLQueryItem(name: "imageB64", value: b64))
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

        // Fallback: write URL + title to App Group so the main app picks them up on next launch.
        // Note: image is not stored in the fallback path to avoid large UserDefaults writes.
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
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
