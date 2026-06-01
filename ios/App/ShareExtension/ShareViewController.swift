import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app via the travelpanel:// URL scheme.
//
// For platforms like Xiaohongshu that block server-side scraping, the extension
// captures the screenshot image so Claude Vision can extract metadata + substance
// directly from the visual content.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // Holds a captured image while we wait for the URL attachment to be loaded
    private var capturedImageBase64: String?

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

            // Pre-pass: capture any image attachment asynchronously.
            // This runs in parallel with URL extraction; the image is stored in
            // capturedImageBase64 and saved to App Group when openApp is called.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let image = data as? UIImage {
                            uiImage = image
                        } else if let data = data as? Data {
                            uiImage = UIImage(data: data)
                        } else if let url = data as? URL,
                                  let data = try? Data(contentsOf: url) {
                            uiImage = UIImage(data: data)
                        }
                        if let img = uiImage {
                            self.capturedImageBase64 = self.compressToBase64(img, targetKB: 200)
                        }
                    }
                    break
                }
            }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            // Short delay to let the image pre-pass complete
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                self.openApp(url: url.absoluteString, title: title)
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
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                self.openApp(url: url, title: text)
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

    // Compress UIImage to JPEG, scale down to fit within maxDim, targeting ≤targetKB.
    private func compressToBase64(_ image: UIImage, targetKB: Int) -> String? {
        let maxDim: CGFloat = 1024
        let scale = min(1.0, maxDim / max(image.size.width, image.size.height))
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: targetSize, format: format)
            .image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }

        var quality: CGFloat = 0.65
        let targetBytes = targetKB * 1024
        while quality >= 0.15 {
            if let data = resized.jpegData(compressionQuality: quality),
               data.count <= targetBytes {
                return data.base64EncodedString()
            }
            quality -= 0.1
        }
        return resized.jpegData(compressionQuality: 0.15)?.base64EncodedString()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        let hasImage = capturedImageBase64 != nil

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",      value: url),
            URLQueryItem(name: "title",    value: title),
            URLQueryItem(name: "hasImage", value: hasImage ? "1" : "0"),
        ]

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
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let img = capturedImageBase64 {
            defaults.set(img, forKey: "pendingShareImage")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
