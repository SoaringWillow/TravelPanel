import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers
import ImageIO

// TravelPanel Share Extension
//
// Receives a URL (and optional title/image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
// When an image is present (e.g. a Xiaohongshu post screenshot), it is compressed
// and stored in App Group UserDefaults so the web app can retrieve it for Claude Vision.

class ShareViewController: UIViewController {

    private static let appGroupSuite = "group.com.travelpanel.app"
    private static let maxImageDimension: CGFloat = 512
    private static let imageJpegQuality: CGFloat = 0.65

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // MARK: - Main extraction

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Collect all attachments across all items for parallel processing
        var allAttachments: [NSItemProvider] = []
        for item in items {
            allAttachments.append(contentsOf: item.attachments ?? [])
        }

        let titleHint = (items.first?.attributedContentText?.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        // Try each content type in priority order, with image capture running in parallel
        extractURL(from: allAttachments, titleHint: titleHint) { [weak self] urlString, title in
            guard let self else { return }
            guard let urlString else {
                self.finish()
                return
            }

            // Attempt image capture concurrently (non-blocking — app opens regardless)
            self.extractImage(from: allAttachments) { imageBase64 in
                self.openApp(url: urlString, title: title, imageBase64: imageBase64)
            }
        }
    }

    // MARK: - URL extraction

    private func extractURL(
        from attachments: [NSItemProvider],
        titleHint: String,
        completion: @escaping (String?, String) -> Void
    ) {
        // Priority 1: direct URL attachment
        if let urlProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
        }) {
            urlProvider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    completion(url.absoluteString, titleHint.isEmpty ? (url.host ?? "") : titleHint)
                } else {
                    completion(nil, "")
                }
            }
            return
        }

        // Priority 2: plain text containing a URL
        if let textProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier)
        }) {
            textProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                if let text = data as? String, let url = self.extractURL(from: text) {
                    completion(url, text)
                } else {
                    completion(nil, "")
                }
            }
            return
        }

        // Priority 3: web page URL (covers Safari "Copy Link" shares)
        if let webProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier("public.url")
        }) {
            webProvider.loadItem(forTypeIdentifier: "public.url") { data, _ in
                if let url = data as? URL {
                    completion(url.absoluteString, titleHint)
                } else {
                    completion(nil, "")
                }
            }
            return
        }

        completion(nil, "")
    }

    // MARK: - Image extraction

    // Tries to capture an image from the share payload (common in Xiaohongshu shares).
    // Scales the image to maxImageDimension and returns JPEG base64, or nil if unavailable.
    private func extractImage(
        from attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        let imageProvider = attachments.first { provider in
            provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
            provider.hasItemConformingToTypeIdentifier(UTType.jpeg.identifier) ||
            provider.hasItemConformingToTypeIdentifier(UTType.png.identifier)
        }

        guard let imageProvider else {
            completion(nil)
            return
        }

        let typeId: String
        if imageProvider.hasItemConformingToTypeIdentifier(UTType.jpeg.identifier) {
            typeId = UTType.jpeg.identifier
        } else if imageProvider.hasItemConformingToTypeIdentifier(UTType.png.identifier) {
            typeId = UTType.png.identifier
        } else {
            typeId = UTType.image.identifier
        }

        imageProvider.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
            guard let self else { completion(nil); return }

            var image: UIImage?
            if let uiImage = data as? UIImage {
                image = uiImage
            } else if let url = data as? URL, let loaded = UIImage(contentsOfFile: url.path) {
                image = loaded
            } else if let data = data as? Data {
                image = UIImage(data: data)
            }

            guard let original = image else {
                completion(nil)
                return
            }

            let scaled = self.scaleImage(original, maxDimension: Self.maxImageDimension)
            guard let jpegData = scaled.jpegData(compressionQuality: Self.imageJpegQuality) else {
                completion(nil)
                return
            }

            completion(jpegData.base64EncodedString())
        }
    }

    // MARK: - Image scaling

    private func scaleImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }

        let scale = maxDimension / max(size.width, size.height)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    // MARK: - Deep link

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Store image in App Group so the web app can retrieve it via @capacitor/preferences
        let hasImage = imageBase64.map { base64 -> Bool in
            savePendingImage(base64)
            return true
        } ?? false

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

        // Open the main app with the deep link (iOS 13+ responder chain approach)
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

        // Fallback: persist everything to App Group for the next app launch
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    // MARK: - App Group persistence

    private func savePendingImage(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupSuite) else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set("1",    forKey: "pendingShareHasImage")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupSuite) else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if hasImage {
            defaults.set("1", forKey: "pendingShareHasImage")
        }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // MARK: - Helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
