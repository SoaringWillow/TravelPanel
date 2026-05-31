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
// When an image attachment is found (common for Xiaohongshu, Douyin, WeChat
// shares that include a preview screenshot), it is compressed to JPEG and
// stored in the App Group as base64 so the main app can pass it to the
// Claude Vision extraction path.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// and image + URL combined shares.

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
        var foundImageProvider: NSItemProvider?

        // Collect all providers first so we can handle URL + image together
        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier), foundURL == nil {
                    // Mark: we'll load this below
                    foundTitle = item.attributedContentText?.string ?? ""
                    loadURL(from: attachment, title: foundTitle ?? "", imageProvider: foundImageProvider)
                    return
                }
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier), foundImageProvider == nil {
                    foundImageProvider = attachment
                }
            }

            // Plain text fallback (may contain a URL)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier), foundURL == nil {
                    loadPlainText(from: attachment, imageProvider: foundImageProvider)
                    return
                }
            }
        }

        finish()
    }

    // MARK: - Loaders

    private func loadURL(from provider: NSItemProvider, title: String, imageProvider: NSItemProvider?) {
        provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
            guard let self else { return }
            guard let url = data as? URL else { self.finish(); return }

            if let imgProvider = imageProvider {
                self.loadImage(from: imgProvider) { imageBase64, mimeType in
                    self.openApp(url: url.absoluteString, title: title,
                                 imageBase64: imageBase64, imageMimeType: mimeType)
                }
            } else {
                self.openApp(url: url.absoluteString, title: title)
            }
        }
    }

    private func loadPlainText(from provider: NSItemProvider, imageProvider: NSItemProvider?) {
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
            guard let self else { return }
            guard let text = data as? String, let urlString = self.extractURL(from: text) else {
                self.finish()
                return
            }

            if let imgProvider = imageProvider {
                self.loadImage(from: imgProvider) { imageBase64, mimeType in
                    self.openApp(url: urlString, title: text,
                                 imageBase64: imageBase64, imageMimeType: mimeType)
                }
            } else {
                self.openApp(url: urlString, title: text)
            }
        }
    }

    private func loadImage(from provider: NSItemProvider, completion: @escaping (String?, String) -> Void) {
        provider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
            var image: UIImage?

            if let uiImage = data as? UIImage {
                image = uiImage
            } else if let url = data as? URL, let loaded = UIImage(contentsOfFile: url.path) {
                image = loaded
            } else if let data = data as? Data {
                image = UIImage(data: data)
            }

            guard let img = image else {
                completion(nil, "image/jpeg")
                return
            }

            // Resize to max 800px on the long edge to keep base64 payload small
            let maxDim: CGFloat = 800
            let scale = min(maxDim / img.size.width, maxDim / img.size.height, 1.0)
            let targetSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
            let renderer = UIGraphicsImageRenderer(size: targetSize)
            let resized = renderer.image { _ in img.draw(in: CGRect(origin: .zero, size: targetSize)) }

            guard let jpegData = resized.jpegData(compressionQuality: 0.65) else {
                completion(nil, "image/jpeg")
                return
            }

            completion(jpegData.base64EncodedString(), "image/jpeg")
        }
    }

    // MARK: - Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(
        url: String,
        title: String,
        imageBase64: String? = nil,
        imageMimeType: String = "image/jpeg"
    ) {
        // Always store image data in App Group first (URL scheme can't carry binary)
        if let base64 = imageBase64 {
            savePendingImageToAppGroup(base64: base64, mimeType: imageMimeType)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
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

        // Fallback: write everything to App Group for next app launch
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

    private func savePendingImageToAppGroup(base64: String, mimeType: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.set(mimeType, forKey: "pendingShareImageMimeType")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
