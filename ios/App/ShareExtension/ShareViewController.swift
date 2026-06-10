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
// For anti-scraping platforms (Xiaohongshu, WeChat), it also captures any image
// attachment, compresses it, and writes it to the App Group so the web layer can
// pass it to Claude Vision for richer extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, plus
//                          image attachments on any of the above.

class ShareViewController: UIViewController {

    // Accumulate extraction results across async callbacks before opening the app.
    private var extractedURL: String?
    private var extractedTitle: String?
    private var extractedImageBase64: String?
    private var pendingCallbacks = 0

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

            // Count how many async loads we're launching so we know when all are done.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) ||
                   attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    pendingCallbacks += 1
                }
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
                   attachment.hasItemConformingToTypeIdentifier("public.jpeg") ||
                   attachment.hasItemConformingToTypeIdentifier("public.png") {
                    pendingCallbacks += 1
                }
            }

            for attachment in attachments {
                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        if let url = data as? URL {
                            self?.extractedURL = url.absoluteString
                            if self?.extractedTitle == nil {
                                self?.extractedTitle = (item.attributedContentText?.string ?? url.host) ?? ""
                            }
                        }
                        self?.callbackDone()
                    }
                    continue
                }

                // Plain text that may contain a URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        if let text = data as? String {
                            if self?.extractedURL == nil, let url = self?.extractURL(from: text) {
                                self?.extractedURL = url
                                self?.extractedTitle = text
                            }
                        }
                        self?.callbackDone()
                    }
                    continue
                }

                // Image attachment — capture for Claude Vision
                let imageType: String? = attachment.hasItemConformingToTypeIdentifier("public.jpeg") ? "public.jpeg" :
                                         attachment.hasItemConformingToTypeIdentifier("public.png")  ? "public.png"  :
                                         attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) ? UTType.image.identifier : nil

                if let imageType = imageType {
                    attachment.loadItem(forTypeIdentifier: imageType) { [weak self] data, _ in
                        var image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else if let imgData = data as? Data {
                            image = UIImage(data: imgData)
                        }

                        if let image = image, self?.extractedImageBase64 == nil {
                            self?.extractedImageBase64 = Self.compressImage(image)
                        }
                        self?.callbackDone()
                    }
                }
            }
        }

        // If nothing launched, finish immediately.
        if pendingCallbacks == 0 { finish() }
    }

    private func callbackDone() {
        pendingCallbacks -= 1
        if pendingCallbacks <= 0 {
            if let url = extractedURL {
                openApp(url: url, title: extractedTitle ?? "", imageBase64: extractedImageBase64)
            } else {
                finish()
            }
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    /// Scales the image to max 800pt wide and compresses as JPEG at 60% quality.
    /// Keeps the result small enough for UserDefaults (≈ 100–200 KB base64).
    private static func compressImage(_ image: UIImage) -> String? {
        let maxWidth: CGFloat = 800
        var target = image
        if image.size.width > maxWidth {
            let scale = maxWidth / image.size.width
            let size  = CGSize(width: maxWidth, height: image.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: size))
            target = UIGraphicsGetImageFromCurrentImageContext() ?? image
            UIGraphicsEndImageContext()
        }
        guard let jpegData = target.jpegData(compressionQuality: 0.6) else { return nil }
        return jpegData.base64EncodedString()
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Persist image to App Group so the web layer can pick it up.
        if let imageBase64 = imageBase64,
           let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
            defaults.set(imageBase64, forKey: "pendingShareImage")
            defaults.set("image/jpeg", forKey: "pendingShareImageType")
            defaults.synchronize()
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if imageBase64 != nil {
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

        // Fallback: write all data to App Group for main app to pick up on next launch.
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
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
