import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives shared content from the iOS Share Sheet and opens the main app.
// Handles URLs, plain text, and images (e.g. Xiaohongshu screenshots).
//
// Extraction priority:
//   1. Image attachment (thumbnail / screenshot)  → stored in App Group as base64
//   2. URL attachment                             → passed in URL scheme
//   3. Plain text containing a URL               → URL extracted from text
//
// The image is stored under "pendingShareImageBase64" in the shared App Group
// UserDefaults suite so the CapacitorBridge can pick it up via @capacitor/preferences.

class ShareViewController: UIViewController {

    // Maximum image dimension (px) and JPEG quality before base64-encoding.
    // Keeping the payload small enough for UserDefaults (~150 KB binary).
    private static let maxImageDimension: CGFloat = 600
    private static let jpegQuality: CGFloat       = 0.5

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

        // Collect all attachments across all input items for parallel inspection.
        var urlAttachment:   NSItemProvider?
        var imageAttachment: NSItemProvider?
        var textAttachment:  NSItemProvider?
        var titleCandidate   = ""

        for item in items {
            titleCandidate = item.attributedContentText?.string ?? titleCandidate
            for attachment in item.attachments ?? [] {
                if imageAttachment == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    imageAttachment = attachment
                }
                if urlAttachment == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlAttachment = attachment
                }
                if textAttachment == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    textAttachment = attachment
                }
            }
        }

        // Resolve URL first (synchronous-ish via DispatchGroup), then image.
        let group = DispatchGroup()
        var resolvedURL   = ""
        var resolvedTitle = titleCandidate

        // ── Resolve URL ──────────────────────────────────────────────────────
        if let urlProv = urlAttachment {
            group.enter()
            urlProv.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    resolvedURL = url.absoluteString
                }
                group.leave()
            }
        } else if let textProv = textAttachment {
            group.enter()
            textProv.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                if let text = data as? String {
                    resolvedTitle = text
                    resolvedURL   = self.extractURL(from: text) ?? ""
                }
                group.leave()
            }
        }

        // ── Resolve image ────────────────────────────────────────────────────
        var imageBase64: String?
        if let imgProv = imageAttachment {
            group.enter()
            imgProv.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                var uiImage: UIImage?
                if let image = data as? UIImage {
                    uiImage = image
                } else if let url = data as? URL,
                          let imgData = try? Data(contentsOf: url) {
                    uiImage = UIImage(data: imgData)
                } else if let data = data as? Data {
                    uiImage = UIImage(data: data)
                }

                if let image = uiImage {
                    imageBase64 = Self.compressAndEncode(image)
                }
                group.leave()
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if resolvedURL.isEmpty {
                self.finish()
                return
            }
            self.openApp(url: resolvedURL, title: resolvedTitle, imageBase64: imageBase64)
        }
    }

    // MARK: - Image compression

    private static func compressAndEncode(_ image: UIImage) -> String? {
        let size = image.size
        let scale: CGFloat
        if size.width > size.height {
            scale = size.width  > maxImageDimension ? maxImageDimension / size.width  : 1
        } else {
            scale = size.height > maxImageDimension ? maxImageDimension / size.height : 1
        }

        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        guard let jpegData = resized.jpegData(compressionQuality: jpegQuality) else { return nil }

        // Skip if compressed image is still too large for UserDefaults (~200 KB binary)
        guard jpegData.count < 200_000 else { return nil }

        return jpegData.base64EncodedString()
    }

    // MARK: - URL helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: - App open

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Always persist to App Group — used by the fallback path and image retrieval.
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)

        var components    = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"

        var queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        // Signal that image data is waiting in App Group so the bridge picks it up.
        if imageBase64 != nil {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

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

        // URL scheme open failed — App Group data will be read on next app launch.
        finish()
    }

    // MARK: - App Group storage

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if let b64 = imageBase64 {
            defaults.set(b64, forKey: "pendingShareImageBase64")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
        }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // MARK: - Finish

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
