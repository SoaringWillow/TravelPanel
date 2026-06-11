import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is captured (e.g. Xiaohongshu post screenshot), it is stored
// in the App Group under the key "pendingShareImage" as a base64 JPEG string.
// The web layer reads it via Capacitor Preferences and passes it to Claude Vision.
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

        var foundURL: String?
        var foundTitle: String?

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            foundURL = url.absoluteString
                            foundTitle = title
                        }
                    }
                    // Continue collecting — may still find image attachments below
                }
            }

            // Priority 2: plain text that may contain a URL
            if foundURL == nil {
                for attachment in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                        attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                            guard let self else { return }
                            if let text = data as? String, let url = self.extractURL(from: text) {
                                foundURL = url
                                foundTitle = text
                            }
                        }
                    }
                }
            }

            // Image capture: look for any image attachment (runs regardless of URL found).
            // Stores a compressed JPEG in the App Group so Claude Vision can process it.
            for attachment in attachments {
                let imageTypes: [String] = [
                    UTType.image.identifier,
                    UTType.jpeg.identifier,
                    UTType.png.identifier,
                    "public.image",
                ]
                for imageType in imageTypes {
                    if attachment.hasItemConformingToTypeIdentifier(imageType) {
                        attachment.loadItem(forTypeIdentifier: imageType) { [weak self] data, _ in
                            guard let self else { return }
                            var image: UIImage?
                            if let uiImage = data as? UIImage {
                                image = uiImage
                            } else if let fileURL = data as? URL, let uiImage = UIImage(contentsOfFile: fileURL.path) {
                                image = uiImage
                            } else if let rawData = data as? Data, let uiImage = UIImage(data: rawData) {
                                image = uiImage
                            }
                            if let image = image {
                                self.storeImage(image)
                            }
                        }
                        break // one image per item is enough
                    }
                }
            }
        }

        // Give async item loading a brief window to complete, then open the app.
        // 0.5 s is enough for the main thread item callbacks to settle.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self else { return }
            let url   = foundURL ?? ""
            let title = foundTitle ?? ""
            let hasImage = self.hasPendingImage()

            if url.isEmpty && !hasImage {
                self.finish()
                return
            }
            self.openApp(url: url, title: title, hasImage: hasImage)
        }
    }

    // ── Image storage ─────────────────────────────────────────────────────

    private func storeImage(_ image: UIImage) {
        // Resize to max 800px on the longest side, then compress to ≤50 KB.
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()

        // Use quality 0.5 to stay under ~50 KB for most post screenshots
        guard let jpegData = resized.jpegData(compressionQuality: 0.5) else { return }

        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(jpegData.base64EncodedString(), forKey: "pendingShareImage")
        defaults.synchronize()
    }

    private func hasPendingImage() -> Bool {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }
        return defaults.string(forKey: "pendingShareImage") != nil
    }

    // ── URL helpers ───────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

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

        // Fallback: write to App Group and let the main app pick it up on next launch
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

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
