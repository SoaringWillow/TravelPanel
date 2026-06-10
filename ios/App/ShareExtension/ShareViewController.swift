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
// For Xiaohongshu and WeChat (whose URLs return empty content when scraped),
// the extension also captures the shared screenshot/image and encodes it
// as base64 in the deep link so the app can use Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images (screenshots shared alongside a URL).

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

        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String = ""
        var extractedImageBase64: String?

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // URL attachment — highest priority
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            extractedURL = url.absoluteString
                            if extractedTitle.isEmpty {
                                extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                            }
                        }
                    }
                }

                // Image attachment — captures screenshots from Xiaohongshu, WeChat, etc.
                // Claude Vision analyzes the image when the URL can't be scraped.
                else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let image = data as? UIImage {
                            uiImage = image
                        } else if let fileURL = data as? URL,
                                  let imgData = try? Data(contentsOf: fileURL) {
                            uiImage = UIImage(data: imgData)
                        }
                        if let image = uiImage, extractedImageBase64 == nil {
                            extractedImageBase64 = self.compressImageToBase64(image)
                        }
                    }
                }

                // Plain text (fallback — may contain a URL)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String,
                           let url = self.extractURL(from: text),
                           extractedURL == nil {
                            extractedURL = url
                            extractedTitle = text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = extractedURL {
                self.openApp(url: url, title: extractedTitle, imageBase64: extractedImageBase64)
            } else {
                self.finish()
            }
        }
    }

    // Resize the image to at most 768px on the longest side and JPEG-compress it.
    // A typical phone screenshot at 768px becomes ~30–50 KB JPEG → ~40–67 KB base64,
    // which fits comfortably in a URL query parameter on iOS.
    private func compressImageToBase64(_ image: UIImage,
                                       maxSide: CGFloat = 768,
                                       quality: CGFloat = 0.65) -> String? {
        let size = image.size
        let ratio = min(maxSide / size.width, maxSide / size.height, 1.0)
        let newSize = ratio < 1.0
            ? CGSize(width: (size.width * ratio).rounded(),
                     height: (size.height * ratio).rounded())
            : size

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let data = resized.jpegData(compressionQuality: quality) else { return nil }
        return data.base64EncodedString()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let b64 = imageBase64 {
            queryItems.append(URLQueryItem(name: "imageBase64", value: b64))
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
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
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
