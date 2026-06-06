import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives shared content from the iOS Share Sheet and opens the main app via
// the travelpanel://share?url=...&title=[&hasImage=1] URL scheme.
//
// Priority order for attachments:
//   0. Image — compresses to JPEG, saves base64 to App Group, flags hasImage=1
//   1. URL   — passes directly
//   2. Plain text containing a URL — extracts the URL

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

            // Priority 0: image attachments (Xiaohongshu / WeChat screenshots)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    let titleHint = item.attributedContentText?.string ?? ""
                    loadAndStoreImage(from: attachment, titleHint: titleHint)
                    return
                }
            }

            // Priority 1: direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.openApp(url: url.absoluteString, title: title, hasImage: false)
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
                            self.openApp(url: url, title: text, hasImage: false)
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

    // Loads image from the provider, compresses it, saves to App Group, then opens app.
    private func loadAndStoreImage(from provider: NSItemProvider, titleHint: String) {
        provider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] item, _ in
            guard let self else { return }

            var image: UIImage?
            if let uiImage = item as? UIImage {
                image = uiImage
            } else if let url = item as? URL {
                image = UIImage(contentsOfFile: url.path)
            } else if let data = item as? Data {
                image = UIImage(data: data)
            }

            guard let img = image, let base64 = self.compressToBase64(img) else {
                // Couldn't load image — fall back to finishing without a clip
                self.finish()
                return
            }

            if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(base64, forKey: "pendingShareImageBase64")
                defaults.set("image/jpeg", forKey: "pendingShareImageMimeType")
                defaults.set("1", forKey: "pendingShareHasImage")
                defaults.synchronize()
            }

            self.openApp(url: "", title: titleHint, hasImage: true)
        }
    }

    // Scales image to max 800px on the longest side and encodes as JPEG (60% quality).
    private func compressToBase64(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 800
        let size = image.size
        var targetSize = size

        if size.width > maxDimension || size.height > maxDimension {
            let scale = min(maxDimension / size.width, maxDimension / size.height)
            targetSize = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        }

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }

        return resized.jpegData(compressionQuality: 0.6)?.base64EncodedString()
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

        // Open the main app via URL scheme (iOS 13+, Share Extensions responder chain)
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

        // Fallback: write to App Group for the app to read on next launch
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if !hasImage {
            defaults.removeObject(forKey: "pendingShareHasImage")
            defaults.removeObject(forKey: "pendingShareImageBase64")
            defaults.removeObject(forKey: "pendingShareImageMimeType")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
