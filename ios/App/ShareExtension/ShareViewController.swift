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
// For anti-scraping platforms (Xiaohongshu, WeChat, Douyin) that don't expose
// HTML content, the extension also captures the first image attachment and
// writes it as a base64 JPEG to App Group storage. The main app reads it during
// enrichment and passes it to Claude Vision instead of web scraping.
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
                            // Also capture any image attachments alongside the URL
                            self.captureImageIfPresent(attachments: attachments) { imageBase64 in
                                self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64)
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
                            self.captureImageIfPresent(attachments: attachments) { imageBase64 in
                                self.openApp(url: url, title: text, imageBase64: imageBase64)
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

    // Tries to load the first image attachment and encode it as base64 JPEG.
    // Calls completion with nil if no image is found or encoding fails.
    private func captureImageIfPresent(
        attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        let imageType = UTType.image.identifier
        guard let imageProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(imageType)
        }) else {
            completion(nil)
            return
        }

        imageProvider.loadItem(forTypeIdentifier: imageType) { data, _ in
            var uiImage: UIImage?

            if let image = data as? UIImage {
                uiImage = image
            } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                uiImage = image
            } else if let imageData = data as? Data, let image = UIImage(data: imageData) {
                uiImage = image
            }

            guard let image = uiImage else {
                completion(nil)
                return
            }

            // Downscale to max 1024px wide/tall to keep payload reasonable
            let maxDim: CGFloat = 1024
            let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
            let targetSize = CGSize(
                width: image.size.width * scale,
                height: image.size.height * scale
            )
            UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: targetSize))
            let resized = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()

            guard let jpegData = (resized ?? image).jpegData(compressionQuality: 0.6) else {
                completion(nil)
                return
            }

            completion(jpegData.base64EncodedString())
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Write image to App Group BEFORE opening the deep link so the main
        // app can read it from Capacitor Preferences when it wakes.
        if let image = imageBase64 {
            savePendingImageToAppGroup(imageBase64: image)
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

        // Fallback: write URL + title to App Group as well
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

    private func savePendingImageToAppGroup(imageBase64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(imageBase64, forKey: "pendingShareImage")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
