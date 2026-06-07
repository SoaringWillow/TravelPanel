import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is also present (e.g. Xiaohongshu, Instagram) it is compressed
// to JPEG and saved to the App Group UserDefaults under `pendingShareImage` so
// the main app can pass it to Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images shared alongside a URL.

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

        // Step 1: extract URL and title from the share payload.
        extractURLAndTitle(from: items) { [weak self] urlString, title in
            guard let self else { return }
            guard let urlString else {
                self.finish()
                return
            }

            // Step 2: try to grab an image from the same payload.
            // Done concurrently — we open the app whether or not an image is found.
            self.captureImage(from: items) { [weak self] base64jpeg in
                guard let self else { return }

                if let b64 = base64jpeg {
                    self.savePendingImageToAppGroup(base64: b64)
                }

                self.openApp(url: urlString, title: title, hasImage: base64jpeg != nil)
            }
        }
    }

    // MARK: - URL extraction

    private func extractURLAndTitle(
        from items: [NSExtensionItem],
        completion: @escaping (String?, String) -> Void
    ) {
        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            completion(url.absoluteString, title)
                        } else {
                            completion(nil, "")
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
                        if let text = data as? String, let url = self.extractURLString(from: text) {
                            completion(url, text)
                        } else {
                            completion(nil, "")
                        }
                    }
                    return
                }
            }
        }

        completion(nil, "")
    }

    private func extractURLString(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - Image capture

    private func captureImage(
        from items: [NSExtensionItem],
        completion: @escaping (String?) -> Void
    ) {
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                // Accept any image type
                let imageType = UTType.image.identifier
                if attachment.hasItemConformingToTypeIdentifier(imageType) {
                    attachment.loadItem(forTypeIdentifier: imageType) { data, _ in
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else if let dataObj = data as? Data, let img = UIImage(data: dataObj) {
                            image = img
                        } else {
                            image = nil
                        }

                        if let img = image, let b64 = self.compressImage(img) {
                            completion(b64)
                        } else {
                            completion(nil)
                        }
                    }
                    return
                }
            }
        }

        completion(nil)
    }

    // Resize to fit within 1024px and compress to JPEG (~100–200 KB).
    private func compressImage(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 1024
        let size = image.size
        let scale = min(maxDimension / max(size.width, size.height), 1.0)
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.75) else { return nil }

        // Skip images larger than 400 KB after compression — too large for UserDefaults.
        guard jpegData.count <= 400 * 1024 else { return nil }

        return jpegData.base64EncodedString()
    }

    // MARK: - App Group storage

    private func savePendingImageToAppGroup(base64: String) {
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

    // MARK: - Open app

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
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

        // Fallback: write to App Group — main app reads it on next launch.
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    // MARK: - Lifecycle

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
