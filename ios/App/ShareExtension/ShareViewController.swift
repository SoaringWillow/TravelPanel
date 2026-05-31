import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL/image (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL
// scheme, which the CapacitorBridge component routes to /share.
//
// Priority order when multiple attachment types are present:
//   1. URL attachment → extract URL, also save any image for Vision extraction
//   2. Image attachment → save image to App Group, open share with hasImage=1
//   3. Plain text containing a URL → extract and open
//
// The image (if any) is saved as JPEG to the App Group shared container so
// the main app can read it and pass it to the Claude Vision API for richer
// extraction from platforms that block web scraping (Xiaohongshu, WeChat).

private let appGroupId = "group.com.travelpanel.app"
private let pendingImageFilename = "pendingShareImage.jpg"
private let maxImageDimension: CGFloat = 1024
private let imageJpegQuality: CGFloat = 0.75

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

        // Collect all attachments across all items
        let allAttachments = items.flatMap { ($0.attachments ?? []) }
        let contentText = items.first?.attributedContentText?.string ?? ""

        // Priority 1: URL attachment (with optional image sidecar)
        if let urlAttachment = allAttachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            urlAttachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                guard let self else { return }
                let url = (data as? URL)?.absoluteString ?? ""
                let title = contentText.isEmpty ? (URL(string: url)?.host ?? "") : contentText

                // Also look for an image attachment to improve extraction quality
                if let imageAttachment = allAttachments.first(where: {
                    $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
                }) {
                    imageAttachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] imgData, _ in
                        guard let self else { return }
                        let hasImage = self.savePendingImage(from: imgData)
                        self.openApp(url: url, title: title, hasImage: hasImage)
                    }
                } else {
                    self.openApp(url: url, title: title, hasImage: false)
                }
            }
            return
        }

        // Priority 2: Image-only share (e.g. screenshot from Photos / Xiaohongshu)
        if let imageAttachment = allAttachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) {
            imageAttachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                guard let self else { return }
                let hasImage = self.savePendingImage(from: data)
                self.openApp(url: "", title: contentText, hasImage: hasImage)
            }
            return
        }

        // Priority 3: Plain text that may contain a URL
        if let textAttachment = allAttachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            textAttachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                guard let self else { return }
                if let text = data as? String, let url = self.extractURL(from: text) {
                    self.openApp(url: url, title: text, hasImage: false)
                } else {
                    self.finish()
                }
            }
            return
        }

        finish()
    }

    // Save an image attachment to the App Group shared container as a compressed JPEG.
    // Returns true if the image was saved successfully.
    @discardableResult
    private func savePendingImage(from data: Any?) -> Bool {
        var image: UIImage?

        if let uiImage = data as? UIImage {
            image = uiImage
        } else if let url = data as? URL, let loaded = UIImage(contentsOfFile: url.path) {
            image = loaded
        } else if let data = data as? Data {
            image = UIImage(data: data)
        }

        guard let original = image else { return false }

        // Downscale to avoid oversized API payloads
        let scaled = scaleImage(original, maxDimension: maxImageDimension)
        guard let jpeg = scaled.jpegData(compressionQuality: imageJpegQuality) else { return false }

        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else { return false }

        let destURL = containerURL.appendingPathComponent(pendingImageFilename)
        do {
            try jpeg.write(to: destURL, options: .atomic)
            // Record a flag so the main app knows to look for the file
            UserDefaults(suiteName: appGroupId)?.set(true, forKey: "hasPendingImage")
            UserDefaults(suiteName: appGroupId)?.synchronize()
            return true
        } catch {
            return false
        }
    }

    private func scaleImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
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

        // Fallback: write to App Group and let the main app pick it up on next launch
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
