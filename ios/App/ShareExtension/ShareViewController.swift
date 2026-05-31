import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives shared content from the iOS Share Sheet and opens the main TravelPanel
// app via the travelpanel://share?url=...&title=... URL scheme.
//
// Capture priority:
//   1. URL attachment  → forward directly
//   2. Plain text with a URL → extract and forward
//   3. Image attachment (e.g. Xiaohongshu/WeChat screenshot) → save to App Group,
//      forward with imageGroupKey=1 so CapacitorBridge can read it back
//
// App Group identifier must match the one configured in Xcode capabilities.

private let appGroupID = "group.com.travelpanel.app"

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
                            self.openApp(url: url.absoluteString, title: title, imageGroupKey: nil)
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
                            self.openApp(url: url, title: text, imageGroupKey: nil)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image attachment (screenshot from Xiaohongshu, WeChat, etc.)
            // Save compressed JPEG to App Group so the main app can read it back.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var image: UIImage? = data as? UIImage
                        if image == nil, let url = data as? URL {
                            image = UIImage(contentsOfFile: url.path)
                        }
                        guard let image else {
                            self.finish()
                            return
                        }
                        let key = self.saveImageToAppGroup(image)
                        // URL may be empty for pure screenshot shares
                        let pageURL = item.attributedContentText?.string ?? ""
                        self.openApp(url: pageURL, title: "", imageGroupKey: key)
                    }
                    return
                }
            }
        }

        finish()
    }

    // Saves a downscaled + compressed JPEG to App Group UserDefaults (base64).
    // Returns the key name (constant: "pendingShareImage" — one pending image at a time).
    private func saveImageToAppGroup(_ image: UIImage) -> String {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return "" }

        let maxDim: CGFloat = 1280
        let size = image.size
        let scale = min(1, maxDim / max(size.width, size.height))
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()

        guard let jpegData = resized.jpegData(compressionQuality: 0.5) else { return "" }
        defaults.set(jpegData.base64EncodedString(), forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        defaults.synchronize()
        return "pendingShareImage"
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageGroupKey: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems: [URLQueryItem] = []
        if !url.isEmpty { queryItems.append(URLQueryItem(name: "url", value: url)) }
        if !title.isEmpty { queryItems.append(URLQueryItem(name: "title", value: title)) }
        if let key = imageGroupKey, !key.isEmpty {
            queryItems.append(URLQueryItem(name: "imageGroupKey", value: key))
        }
        components.queryItems = queryItems.isEmpty ? nil : queryItems

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

        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
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
