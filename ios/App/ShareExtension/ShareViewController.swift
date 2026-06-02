import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives shared content from the iOS Share Sheet and opens the main
// TravelPanel app via the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// Supported share types (in priority order):
//   1. Direct URL attachment  — passes url + title in deep link
//   2. Plain text with a URL  — extracts first URL from text
//   3. Image attachment       — compresses JPEG, stores in App Group, passes hasImage=1
//
// The image path is critical for Xiaohongshu (小红书) whose anti-scraping blocks
// URL fetching. When the user shares a screenshot of an XHS post, the image is
// stored in App Group UserDefaults so the main app can retrieve it for Claude Vision.

class ShareViewController: UIViewController {

    // App Group identifier — must match the one in Xcode capabilities + capacitor.config.ts
    private let appGroup = "group.com.travelpanel.app"
    // Max dimension for compressed share image (px). Enough for Claude Vision to read text.
    private let maxImageDimension: CGFloat = 768

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

            // Priority 3: image attachment (screenshot of Xiaohongshu / 小红书 post)
            // Compresses the image and stores it in App Group UserDefaults so the
            // main app can pass it to Claude Vision for text + location extraction.
            for attachment in attachments {
                let imageTypes = [UTType.image.identifier, UTType.jpeg.identifier, UTType.png.identifier, "com.apple.uikit.image"]
                for typeId in imageTypes {
                    if attachment.hasItemConformingToTypeIdentifier(typeId) {
                        attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                            guard let self else { return }
                            var image: UIImage?
                            if let uiImage = data as? UIImage {
                                image = uiImage
                            } else if let imageData = data as? Data {
                                image = UIImage(data: imageData)
                            } else if let fileURL = data as? URL, fileURL.isFileURL {
                                image = UIImage(contentsOfFile: fileURL.path)
                            }
                            guard let image else { self.finish(); return }
                            self.shareImage(image, sourceText: item.attributedContentText?.string)
                        }
                        return
                    }
                }
            }
        }

        finish()
    }

    // MARK: – Image handling

    private func shareImage(_ image: UIImage, sourceText: String?) {
        guard let compressed = compressImage(image),
              let base64 = compressed.base64EncodedString().addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)
        else {
            finish()
            return
        }

        // Store image in App Group so the main app JS can read it via @capacitor/preferences
        if let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(compressed.base64EncodedString(), forKey: "pendingShareImageBase64")
            defaults.synchronize()
        }

        // Extract a URL from accompanying text, or use a placeholder for vision-only mode
        let url = sourceText.flatMap { extractURL(from: $0) } ?? "xhs://vision-share"
        let title = sourceText ?? "Screenshot"

        // Pass hasImage=1 so CapacitorBridge knows to read pendingShareImageBase64
        openApp(url: url, title: title, hasImage: true)
    }

    private func compressImage(_ image: UIImage) -> Data? {
        let size = image.size
        let scale: CGFloat
        if size.width > size.height {
            scale = min(1, maxImageDimension / size.width)
        } else {
            scale = min(1, maxImageDimension / size.height)
        }
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return resized?.jpegData(compressionQuality: 0.5)
    }

    // MARK: – Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

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

        // Fallback: write to App Group so the main app picks it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        defaults.set(url,   forKey: "pendingShareURL")
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
