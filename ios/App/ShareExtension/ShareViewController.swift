import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives content from the iOS Share Sheet and opens the main TravelPanel app.
//
// Data flow:
//   1. Scan all attachments for: URL, plain text, and image
//   2. Load them concurrently via DispatchGroup
//   3. If an image was found, resize → JPEG → base64 → App Group UserDefaults
//   4. Open the main app via travelpanel://share?url=...&title=...&hasImage=1
//
// The hasImage=1 flag tells CapacitorBridge to read the image from App Group
// and stash it in sessionStorage before navigating to /share.
//
// Supported sources: URLs, plain text containing a URL, web pages, images (XHS screenshots).

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        // Collect the first of each attachment type
        var urlProvider: NSItemProvider? = nil
        var textProvider: NSItemProvider? = nil
        var imageProvider: NSItemProvider? = nil
        var itemTitle: String? = nil

        for item in items {
            guard let attachments = item.attachments else { continue }
            if itemTitle == nil { itemTitle = item.attributedContentText?.string }
            for attachment in attachments {
                if urlProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlProvider = attachment
                }
                if textProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    textProvider = attachment
                }
                if imageProvider == nil && (
                    attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
                    attachment.hasItemConformingToTypeIdentifier(UTType.jpeg.identifier) ||
                    attachment.hasItemConformingToTypeIdentifier(UTType.png.identifier)
                ) {
                    imageProvider = attachment
                }
            }
        }

        // Load all attachments concurrently
        let group = DispatchGroup()
        var resolvedURL: String? = nil
        var resolvedTitle: String? = itemTitle
        var hasImage = false

        if let provider = urlProvider {
            group.enter()
            provider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    resolvedURL = url.absoluteString
                    if resolvedTitle == nil { resolvedTitle = url.host }
                }
                group.leave()
            }
        } else if let provider = textProvider {
            group.enter()
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                if let text = data as? String, let url = self?.extractURL(from: text) {
                    resolvedURL = url
                    if resolvedTitle == nil { resolvedTitle = text }
                }
                group.leave()
            }
        }

        if let provider = imageProvider {
            let typeId = provider.hasItemConformingToTypeIdentifier(UTType.jpeg.identifier)
                ? UTType.jpeg.identifier
                : provider.hasItemConformingToTypeIdentifier(UTType.png.identifier)
                    ? UTType.png.identifier
                    : UTType.image.identifier
            group.enter()
            provider.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                guard let self else { group.leave(); return }
                var image: UIImage? = nil
                if let img = data as? UIImage {
                    image = img
                } else if let fileURL = data as? URL {
                    image = UIImage(contentsOfFile: fileURL.path)
                } else if let imgData = data as? Data {
                    image = UIImage(data: imgData)
                }
                if let img = image {
                    hasImage = self.saveImageToAppGroup(img)
                }
                group.leave()
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = resolvedURL {
                self.openApp(url: url, title: resolvedTitle ?? "", hasImage: hasImage)
            } else {
                self.finish()
            }
        }
    }

    // MARK: — Image helpers

    private func saveImageToAppGroup(_ image: UIImage) -> Bool {
        let resized = resized(image, maxDimension: 800)
        guard let jpegData = resized.jpegData(compressionQuality: 0.65) else { return false }
        let base64 = jpegData.base64EncodedString()
        // Only store images up to ~200 KB (base64) — larger ones won't help vision
        guard base64.count < 200_000 else { return false }
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.synchronize()
        return true
    }

    private func resized(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let maxSide = max(size.width, size.height)
        guard maxSide > maxDimension else { return image }
        let scale = maxDimension / maxSide
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    // MARK: — URL helpers

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: — App opening

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "1"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish(); return
        }

        // Open the main app with the deep link (iOS 13+).
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
