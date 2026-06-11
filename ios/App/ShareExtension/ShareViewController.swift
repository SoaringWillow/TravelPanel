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
// Supported source types: URLs, plain text containing a URL, web pages.

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
        }

        finish()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        // Best-effort: capture any image attachment and save it to App Group so
        // CapacitorBridge can pass it to Claude Vision on the web side.
        // This runs asynchronously and does not block opening the app.
        extractAndSaveImageToAppGroup()

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

    // MARK: — Image capture for Claude Vision

    /// Scans all attachments for the first image payload, compresses it to a
    /// JPEG thumbnail (≤ 768 px, 0.7 quality) and stores the base64 string in
    /// the App Group so CapacitorBridge can forward it to /api/import.
    private func extractAndSaveImageToAppGroup() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return }

        let imageTypeIdentifiers: [String] = [
            UTType.jpeg.identifier,
            UTType.png.identifier,
            UTType.image.identifier,
            "com.apple.uikit.image",
        ]

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                for typeId in imageTypeIdentifiers {
                    guard attachment.hasItemConformingToTypeIdentifier(typeId) else { continue }
                    attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                        guard let self else { return }
                        var image: UIImage?
                        if let uiImage = data as? UIImage {
                            image = uiImage
                        } else if let rawData = data as? Data {
                            image = UIImage(data: rawData)
                        } else if let fileURL = data as? URL,
                                  let fileData = try? Data(contentsOf: fileURL) {
                            image = UIImage(data: fileData)
                        }
                        guard let img = image,
                              let base64 = self.compressToJpegBase64(img) else { return }
                        self.saveImageToAppGroup(base64: base64)
                    }
                    return // Stop after the first matching attachment type
                }
            }
        }
    }

    /// Resizes and JPEG-compresses an image for Vision API consumption.
    private func compressToJpegBase64(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 768
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let targetSize = CGSize(
            width: (image.size.width  * scale).rounded(),
            height: (image.size.height * scale).rounded()
        )
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        guard let jpegData = resized.jpegData(compressionQuality: 0.7) else { return nil }
        return jpegData.base64EncodedString()
    }

    private func saveImageToAppGroup(base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
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
