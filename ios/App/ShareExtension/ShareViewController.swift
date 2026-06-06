import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Image data (if present) is saved to App Group UserDefaults before the deep link
// is opened. CapacitorBridge reads it via @capacitor/preferences (configured with
// group 'group.com.travelpanel.app' in capacitor.config.ts).
//
// Supported source types: URLs, plain text containing a URL, web pages + images.

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

        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImageBase64: String?

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string ?? ""

            for attachment in attachments {
                // Extract URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, extractedURL == nil {
                            extractedURL = url.absoluteString
                            if extractedTitle == nil {
                                extractedTitle = itemTitle.isEmpty ? (url.host ?? "") : itemTitle
                            }
                        }
                    }
                }

                // Extract image (screenshot shared alongside or instead of URL)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if extractedImageBase64 != nil { return }

                        if let image = data as? UIImage {
                            extractedImageBase64 = Self.compressImage(image)
                        } else if let fileURL = data as? URL,
                                  let imageData = try? Data(contentsOf: fileURL) {
                            // Cap raw binary at 500 KB
                            if imageData.count <= 524_288 {
                                extractedImageBase64 = imageData.base64EncodedString()
                            } else if let image = UIImage(data: imageData) {
                                extractedImageBase64 = Self.compressImage(image)
                            }
                        }
                    }
                }

                // Plain text fallback for URL extraction (also check for plain text images)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, extractedURL == nil,
                           let url = self.extractURL(from: text) {
                            extractedURL = url
                            if extractedTitle == nil { extractedTitle = text }
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = extractedURL {
                self.openApp(url: url, title: extractedTitle ?? "", imageBase64: extractedImageBase64)
            } else {
                self.finish()
            }
        }
    }

    // Compress UIImage to JPEG ≤ 500 KB, scaling down if needed
    private static func compressImage(_ image: UIImage) -> String? {
        let maxBytes = 524_288 // 500 KB

        // Try reducing quality first
        for quality: CGFloat in [0.5, 0.3, 0.15] {
            if let data = image.jpegData(compressionQuality: quality), data.count <= maxBytes {
                return data.base64EncodedString()
            }
        }

        // Scale down to max 720 wide
        let scale = min(1.0, 720.0 / max(image.size.width, 1))
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let scaled = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        guard let data = scaled.jpegData(compressionQuality: 0.4), data.count <= maxBytes else {
            return nil
        }
        return data.base64EncodedString()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Save image to App Group UserDefaults before opening deep link.
        // CapacitorBridge reads it via @capacitor/preferences (group configured in capacitor.config.ts).
        if let image = imageBase64 {
            savePendingShareImage(image)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

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

        // Fallback: write URL to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareImage(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
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
