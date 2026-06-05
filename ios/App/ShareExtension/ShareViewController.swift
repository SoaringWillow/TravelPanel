import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=true
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image attachment is present (common with Xiaohongshu/WeChat where page
// scraping is blocked), the screenshot is saved to the App Group as a compressed
// JPEG base64 string. The main app reads it via @capacitor/preferences and passes
// it to /api/import for Claude Vision extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // Captured image base64 (set before openApp is called if an image attachment was found)
    private var capturedImageBase64: String? = nil

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

            // Capture any image attachment first (async, non-blocking relative to URL extraction)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            image = nil
                        }
                        if let image {
                            self.capturedImageBase64 = self.compressImage(image)
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
                            // Small delay to let image capture complete if it's in-flight
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

    // Compress image to a small JPEG for transmission via App Group UserDefaults.
    // Max 600px on the long edge, 60% quality → typically 50–150KB → ~70–200KB base64.
    private func compressImage(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 600
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.6) else { return nil }
        return jpegData.base64EncodedString()
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
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
            URLQueryItem(name: "hasImage", value: hasImage ? "true" : "false"),
        ]

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Pre-write image to App Group so the main app can read it after opening
        if hasImage {
            savePendingShareToAppGroup(url: url, title: title, imageBase64: capturedImageBase64)
        }

        // Open the main app with the deep link via responder chain (iOS 13+)
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
        savePendingShareToAppGroup(url: url, title: title, imageBase64: capturedImageBase64)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String? = nil) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let img = imageBase64 {
            defaults.set(img, forKey: "pendingShareImageBase64")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
