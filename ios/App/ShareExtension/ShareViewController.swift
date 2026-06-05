import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL + optional image (screenshot/preview) from the iOS Share Sheet
// and opens the main TravelPanel app via the travelpanel://share URL scheme,
// which CapacitorBridge routes to /share.
//
// Image data (for Xiaohongshu and other anti-scraping platforms) is stored in
// the shared App Group container via UserDefaults and read by CapacitorBridge
// using @capacitor/preferences on app open.
//
// Supported source types: URLs, plain text containing a URL, web pages, images/screenshots.

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

        // Collect URL and image concurrently across all attachments
        var sharedURL: String?
        var sharedTitle: String?
        var sharedImageData: Data?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string

            for attachment in attachments {
                // URL attachment
                if sharedURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            sharedURL = url.absoluteString
                            if sharedTitle == nil {
                                sharedTitle = itemTitle ?? url.host ?? ""
                            }
                        }
                    }
                }

                // Image attachment (screenshot or share preview)
                if sharedImageData == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let imgData = data as? Data, let image = UIImage(data: imgData) {
                            sharedImageData = Self.resizedJpeg(image, maxDimension: 1024)
                        } else if let image = data as? UIImage {
                            sharedImageData = Self.resizedJpeg(image, maxDimension: 1024)
                        } else if let fileURL = data as? URL,
                                  let imgData = try? Data(contentsOf: fileURL),
                                  let image = UIImage(data: imgData) {
                            sharedImageData = Self.resizedJpeg(image, maxDimension: 1024)
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let url = sharedURL {
                self.openApp(url: url, title: sharedTitle ?? "", imageData: sharedImageData)
            } else {
                self.tryExtractFromPlainText(items: items, imageData: sharedImageData)
            }
        }
    }

    // MARK: - Plain text fallback

    private func tryExtractFromPlainText(items: [NSExtensionItem], imageData: Data?) {
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.openApp(url: url, title: text, imageData: imageData)
                        } else if imageData != nil {
                            // Screenshot-only share — sentinel URL triggers vision-only path in the API
                            let title = item.attributedContentText?.string ?? "Screenshot"
                            self.openApp(url: "travelpanel://vision-import", title: title, imageData: imageData)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }

        // Image-only share with no text
        if imageData != nil {
            openApp(url: "travelpanel://vision-import", title: "Screenshot", imageData: imageData)
        } else {
            finish()
        }
    }

    // MARK: - Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    /// Resize to max dimension and encode as JPEG at 60% quality to keep App Group storage small.
    private static func resizedJpeg(_ image: UIImage, maxDimension: CGFloat) -> Data? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }
        let ratio = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        let targetSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let resized = UIGraphicsImageRenderer(size: targetSize).image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: 0.6)
    }

    // MARK: - Open app

    private func openApp(url: String, title: String, imageData: Data? = nil) {
        // Persist image to App Group so CapacitorBridge can retrieve it via @capacitor/preferences
        if let imageData {
            let base64 = imageData.base64EncodedString()
            if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(base64, forKey: "pendingShareImageBase64")
                defaults.set("image/jpeg", forKey: "pendingShareImageMime")
                defaults.synchronize()
            }
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageData != nil {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "true"))
        }

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
