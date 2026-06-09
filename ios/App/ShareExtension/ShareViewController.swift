import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Also captures a screenshot or thumbnail image when shared alongside a URL
// (common on Xiaohongshu, WeChat, Douyin) and stores it in the App Group
// shared container so the main app can pass it to Claude Vision for richer
// extraction on scraping-resistant platforms.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images (captured alongside a URL share).

class ShareViewController: UIViewController {

    private var capturedURL: String?
    private var capturedTitle: String?
    private var capturedImageBase64: String?

    // Remaining attachments to process after the URL is found
    private var pendingImageAttachments: [NSItemProvider] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Gather all attachments from all input items
        var urlAttachments: [NSItemProvider] = []
        var textAttachments: [NSItemProvider] = []
        var imageAttachments: [NSItemProvider] = []

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlAttachments.append(attachment)
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    textAttachments.append(attachment)
                }
                // Capture images regardless — they often come alongside URL attachments
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    imageAttachments.append(attachment)
                }
            }
            // Prefer the item-level title if present
            if capturedTitle == nil, let text = item.attributedContentText?.string, !text.isEmpty {
                capturedTitle = text
            }
        }

        pendingImageAttachments = imageAttachments

        // Process URL first, then images
        if let urlAttachment = urlAttachments.first {
            urlAttachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                guard let self else { return }
                if let url = data as? URL {
                    self.capturedURL = url.absoluteString
                    if self.capturedTitle == nil {
                        self.capturedTitle = url.host ?? ""
                    }
                }
                self.processImages()
            }
            return
        }

        // Fallback: plain text that may contain a URL
        if let textAttachment = textAttachments.first {
            textAttachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                guard let self else { return }
                if let text = data as? String, let url = self.extractURL(from: text) {
                    self.capturedURL = url
                    self.capturedTitle = text
                }
                self.processImages()
            }
            return
        }

        finish()
    }

    // ── Image capture ─────────────────────────────────────────────────────────

    private func processImages() {
        guard let imageAttachment = pendingImageAttachments.first else {
            openAppOrFinish()
            return
        }

        imageAttachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
            guard let self else { return }

            var image: UIImage?
            if let img = data as? UIImage {
                image = img
            } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                image = img
            } else if let data = data as? Data, let img = UIImage(data: data) {
                image = img
            }

            if let img = image {
                self.capturedImageBase64 = self.compressImage(img)
                self.saveThumbnail(img)
            }

            self.openAppOrFinish()
        }
    }

    // Scales image to max 480px wide and compresses to JPEG ~50-100KB
    private func compressImage(_ image: UIImage) -> String? {
        let maxWidth: CGFloat = 480
        let scale = min(1.0, maxWidth / image.size.width)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let resized,
              let jpegData = resized.jpegData(compressionQuality: 0.5) else { return nil }

        // Skip images over 300KB to stay within UserDefaults limits
        guard jpegData.count < 300_000 else { return nil }

        return jpegData.base64EncodedString()
    }

    // ── Deep link ─────────────────────────────────────────────────────────────

    private func openAppOrFinish() {
        guard let url = capturedURL, !url.isEmpty else {
            finish()
            return
        }
        openApp(url: url, title: capturedTitle ?? "", imageBase64: capturedImageBase64)
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Write image to App Group before opening the URL scheme
        if let b64 = imageBase64 {
            savePendingImage(b64)
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    // ── App Group storage ─────────────────────────────────────────────────────

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func savePendingImage(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
    }

    // Saves a 200×200 square-cropped JPEG thumbnail for use as the clip cover photo.
    // Stored separately from pendingShareImage (which is the full 480px version for Claude Vision).
    private func saveThumbnail(_ image: UIImage) {
        let side = min(image.size.width, image.size.height)
        let xOrigin = (image.size.width - side) / 2
        let yOrigin = (image.size.height - side) / 2
        let scale = image.scale
        let cropRect = CGRect(
            x: xOrigin * scale, y: yOrigin * scale,
            width: side * scale, height: side * scale
        )

        guard let cgImage = image.cgImage?.cropping(to: cropRect) else { return }
        let cropped = UIImage(cgImage: cgImage, scale: scale, orientation: image.imageOrientation)

        UIGraphicsBeginImageContextWithOptions(CGSize(width: 200, height: 200), false, 1.0)
        cropped.draw(in: CGRect(origin: .zero, size: CGSize(width: 200, height: 200)))
        let thumb = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let thumb,
              let jpegData = thumb.jpegData(compressionQuality: 0.7),
              jpegData.count < 100_000 else { return }

        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(jpegData.base64EncodedString(), forKey: "pendingShareThumbnail")
        defaults.synchronize()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
