import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app via the travelpanel:// URL scheme.
//
// For Xiaohongshu, WeChat, and other anti-scraping platforms, the extension
// also captures the on-screen image and passes it to the app so Claude Vision
// can extract content directly from the screenshot instead of the blocked URL.
//
// Two hand-off paths:
//   Primary:  travelpanel://share?url=...&title=...&image=<base64>&imageMime=image/jpeg
//             (used when UIApplication.open is available — foregrounds the main app)
//   Fallback: App Group UserDefaults (used when primary path is unavailable;
//             CapacitorBridge reads these keys on next app launch)

class ShareViewController: UIViewController {

    // Max image size after compression (bytes). Keeps the URL scheme usable.
    private let maxImageBytes = 150_000

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Collect all attachments across all input items
        let allAttachments = items.flatMap { ($0.attachments ?? []) }
        let firstItem = items.first

        // Try to find a URL attachment first, then an image
        extractURL(from: allAttachments, fallbackItem: firstItem) { [weak self] url, title in
            guard let self else { return }
            if let url {
                // In parallel, try to extract a screenshot image for vision platforms
                self.extractImage(from: allAttachments) { imageBase64, imageMime in
                    self.openApp(url: url, title: title ?? "", imageBase64: imageBase64, imageMime: imageMime)
                }
            } else {
                self.finish()
            }
        }
    }

    // MARK: - URL extraction

    private func extractURL(
        from attachments: [NSItemProvider],
        fallbackItem: NSExtensionItem?,
        completion: @escaping (String?, String?) -> Void
    ) {
        // Priority 1: direct URL attachment
        if let urlProvider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            urlProvider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    let title = fallbackItem?.attributedContentText?.string ?? url.host ?? ""
                    completion(url.absoluteString, title)
                } else {
                    completion(nil, nil)
                }
            }
            return
        }

        // Priority 2: plain text that may contain a URL
        if let textProvider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            textProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                if let text = data as? String, let url = Self.extractURL(from: text) {
                    completion(url, text)
                } else {
                    completion(nil, nil)
                }
            }
            return
        }

        completion(nil, nil)
    }

    private static func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - Image extraction

    private func extractImage(
        from attachments: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        // Look for an image attachment (screenshots shared alongside a URL)
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]

        for imageType in imageTypes {
            if let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(imageType) }) {
                provider.loadItem(forTypeIdentifier: imageType) { [weak self] data, _ in
                    guard let self else { completion(nil, nil); return }

                    var image: UIImage?
                    if let uiImage = data as? UIImage {
                        image = uiImage
                    } else if let url = data as? URL, let uiImage = UIImage(contentsOfFile: url.path) {
                        image = uiImage
                    } else if let imgData = data as? Data {
                        image = UIImage(data: imgData)
                    }

                    guard let sourceImage = image else {
                        completion(nil, nil)
                        return
                    }

                    if let (base64, mime) = self.compressImage(sourceImage) {
                        completion(base64, mime)
                    } else {
                        completion(nil, nil)
                    }
                }
                return
            }
        }

        // No image found
        completion(nil, nil)
    }

    // Compress and resize image to fit within maxImageBytes.
    // Returns (base64, mimeType) or nil if compression fails.
    private func compressImage(_ image: UIImage) -> (String, String)? {
        // Target dimensions: max 800px on longest side (enough for Claude Vision to read text)
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let resizedImage = resized else { return nil }

        // Try progressively lower JPEG quality until we fit within maxImageBytes
        for quality in stride(from: 0.5, through: 0.1, by: -0.1) {
            if let data = resizedImage.jpegData(compressionQuality: quality),
               data.count <= maxImageBytes {
                return (data.base64EncodedString(), "image/jpeg")
            }
        }

        // Last resort: very small image at lowest quality
        let tinySize = CGSize(width: 400, height: 400 * targetSize.height / targetSize.width)
        UIGraphicsBeginImageContextWithOptions(tinySize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: tinySize))
        let tiny = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        if let data = tiny?.jpegData(compressionQuality: 0.1), data.count <= maxImageBytes {
            return (data.base64EncodedString(), "image/jpeg")
        }

        return nil
    }

    // MARK: - App opening

    private func openApp(url: String, title: String, imageBase64: String?, imageMime: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let image = imageBase64, let mime = imageMime {
            queryItems.append(URLQueryItem(name: "image", value: image))
            queryItems.append(URLQueryItem(name: "imageMime", value: mime))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Primary path: open main app via responder chain
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

        // Fallback: write to App Group UserDefaults for CapacitorBridge to read on next launch
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64, imageMime: imageMime)
        finish()
    }

    private func savePendingShareToAppGroup(
        url: String,
        title: String,
        imageBase64: String?,
        imageMime: String?
    ) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let image = imageBase64, let mime = imageMime {
            defaults.set(image, forKey: "pendingShareImage")
            defaults.set(mime, forKey: "pendingShareImageMime")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
