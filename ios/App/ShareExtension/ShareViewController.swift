import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image attachment is present (common for Xiaohongshu which blocks HTML scraping),
// the compressed JPEG is saved to App Group UserDefaults so the web layer can pass it to
// the Claude Vision API for content extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

private let appGroupId = "group.com.travelpanel.app"
// Max base64 size to store in UserDefaults (~375KB compressed = ~500KB base64)
private let maxImageBytes = 375_000

class ShareViewController: UIViewController {

    private var titleHint: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Collect the best attachment of each type across all input items
        var urlProvider: NSItemProvider?
        var textProvider: NSItemProvider?
        var imageProvider: NSItemProvider?

        for item in items {
            for attachment in item.attachments ?? [] {
                if urlProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlProvider = attachment
                    titleHint = item.attributedContentText?.string
                }
                if textProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    textProvider = attachment
                }
                if imageProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    imageProvider = attachment
                }
            }
        }

        func openWithURLAndOptionalImage(_ url: String, title: String) {
            guard let imgProvider = imageProvider else {
                openApp(url: url, title: title, hasImage: false)
                return
            }
            imgProvider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                guard let self else { return }
                let saved = self.saveImageToAppGroup(data)
                self.openApp(url: url, title: title, hasImage: saved)
            }
        }

        if let provider = urlProvider {
            provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                guard let self else { return }
                if let url = data as? URL {
                    let title = self.titleHint ?? url.host ?? ""
                    openWithURLAndOptionalImage(url.absoluteString, title)
                } else {
                    self.finish()
                }
            }
            return
        }

        if let provider = textProvider {
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                guard let self else { return }
                if let text = data as? String, let url = self.extractURL(from: text) {
                    openWithURLAndOptionalImage(url, text)
                } else {
                    self.finish()
                }
            }
            return
        }

        finish()
    }

    // Returns true if the image was successfully saved to App Group
    @discardableResult
    private func saveImageToAppGroup(_ data: Any?) -> Bool {
        var image: UIImage?

        if let img = data as? UIImage {
            image = img
        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
            image = img
        } else if let data = data as? Data, let img = UIImage(data: data) {
            image = img
        }

        guard let image else { return false }

        // Scale down if the image is very large to keep the base64 payload reasonable
        let scaled = scaledImage(image, maxDimension: 1200)

        // Compress to JPEG; try quality steps until under size limit
        var quality: CGFloat = 0.65
        var jpegData: Data?
        while quality >= 0.3 {
            if let d = scaled.jpegData(compressionQuality: quality), d.count <= maxImageBytes {
                jpegData = d
                break
            }
            quality -= 0.15
        }

        guard let jpegData else { return false }

        guard let defaults = UserDefaults(suiteName: appGroupId) else { return false }
        defaults.set(jpegData.base64EncodedString(), forKey: "pendingShareImageBase64")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
        return true
    }

    private func scaledImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
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

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
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
            finish()
            return
        }

        // Open the main app via the responder chain (iOS 13+)
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

        // Fallback: write URL to App Group for pickup on next app launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
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
