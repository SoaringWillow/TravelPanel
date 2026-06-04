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
// Supported source types: URLs, plain text containing a URL, web pages, images.
//
// For Xiaohongshu / WeChat shares (which are often screenshots):
// The image is compressed to JPEG, base64-encoded, and stored in the App Group
// UserDefaults under "pendingShareImage". The deep-link URL includes hasImage=1
// so CapacitorBridge knows to read and forward the image to the share page.

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
                            self.openApp(url: url.absoluteString, title: title, imageBase64: nil)
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
                            self.openApp(url: url, title: text, imageBase64: nil)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image attachment (Xiaohongshu / WeChat screenshots)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let img = data as? UIImage {
                            uiImage = img
                        } else if let url = data as? URL,
                                  let imgData = try? Data(contentsOf: url) {
                            uiImage = UIImage(data: imgData)
                        }

                        guard let uiImage else { self.finish(); return }

                        // Compress to JPEG (quality 0.6) to keep the payload reasonable
                        guard let jpegData = uiImage.jpegData(compressionQuality: 0.6) else {
                            self.finish(); return
                        }
                        let base64 = jpegData.base64EncodedString()
                        let caption = item.attributedContentText?.string ?? "Xiaohongshu clip"
                        // Use a placeholder URL so the share page knows the platform
                        let placeholderUrl = "xiaohongshu://screenshot"
                        self.openApp(url: placeholderUrl, title: caption, imageBase64: base64)
                    }
                    return
                }
            }
        }

        finish()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Store image in App Group before opening the app
        if let image = imageBase64 {
            savePendingShareToAppGroup(url: url, title: title, imageBase64: image)
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
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let image = imageBase64 {
            defaults.set(image, forKey: "pendingShareImage")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
