import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives content from the iOS Share Sheet and opens the main TravelPanel app.
// Three content types are handled in priority order:
//
//   Priority 1: URL attachment  → passes url + title via URL scheme
//   Priority 2: Plain text      → extracts URL from text, falls back to image path
//   Priority 3: Image           → compresses, base64-encodes, stores in App Group,
//                                  then opens app. The web app reads the image via
//                                  Capacitor Preferences (configured to the App Group)
//                                  and passes it to Claude Vision for extraction.
//                                  This is the primary path for Xiaohongshu and WeChat,
//                                  which block server-side URL scraping.

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
                            self.openApp(url: url.absoluteString, title: title)
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
                            self.openApp(url: url, title: text)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image attachment (Xiaohongshu, WeChat screenshots, etc.)
            // URL scraping fails for these platforms, so we use Claude Vision instead.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        var image: UIImage?

                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL {
                            image = UIImage(contentsOfFile: url.path)
                        } else if let raw = data as? Data {
                            image = UIImage(data: raw)
                        }

                        guard let img = image else {
                            self.finish()
                            return
                        }

                        // Resize to ≤1200px and compress — keeps base64 payload under ~500 KB
                        let resized = self.resizeImage(img, maxDimension: 1200)
                        guard let jpegData = resized.jpegData(compressionQuality: 0.75) else {
                            self.finish()
                            return
                        }

                        let base64 = jpegData.base64EncodedString()
                        let title  = item.attributedContentText?.string ?? ""
                        self.saveToAppGroup(imageBase64: base64, title: title)
                        // Open the app with no URL — the share page will read the image
                        // from App Group Preferences and pass it to Claude Vision.
                        self.openApp(url: "", title: title)
                    }
                    return
                }
            }
        }

        finish()
    }

    // MARK: - Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let maxSide = max(size.width, size.height)
        guard maxSide > maxDimension else { return image }

        let scale    = maxDimension / maxSide
        let newSize  = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        defer { UIGraphicsEndImageContext() }
        image.draw(in: CGRect(origin: .zero, size: newSize))
        return UIGraphicsGetImageFromCurrentImageContext() ?? image
    }

    // Writes the image and optional title to the shared App Group UserDefaults so the
    // main app can read them via Capacitor Preferences (configured to the same group).
    private func saveToAppGroup(imageBase64: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(imageBase64, forKey: "pendingShareImageBase64")
        if !title.isEmpty {
            defaults.set(title, forKey: "pendingShareTitle")
        }
        defaults.synchronize()
    }

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [URLQueryItem(name: "url", value: url)]
        if !title.isEmpty {
            queryItems.append(URLQueryItem(name: "title", value: title))
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

        // Fallback: data is already in App Group; the main app will read it on next launch.
        finish()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
