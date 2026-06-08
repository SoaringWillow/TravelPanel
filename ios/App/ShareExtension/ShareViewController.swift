import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For platforms that block server-side scraping (Xiaohongshu, WeChat), any
// available preview image is extracted, down-sampled, and stored in the App
// Group UserDefaults under "pendingShareImage" (base64 JPEG).  The web layer
// then passes this to Claude Vision so substance can still be extracted even
// when the page HTML returns empty.
//
// Supported source types: URLs, plain text containing a URL, web pages.

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

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            // Also try to extract an image from remaining attachments
                            self.extractImage(from: attachments) { imageBase64 in
                                self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64)
                            }
                        } else {
                            self.finish()
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
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.extractImage(from: attachments) { imageBase64 in
                                self.openApp(url: url, title: text, imageBase64: imageBase64)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }

        finish()
    }

    // Looks for an image attachment among the share items and returns a
    // base64-encoded JPEG string (max 512px, 70% quality) via the callback.
    private func extractImage(from attachments: [NSItemProvider], completion: @escaping (String?) -> Void) {
        guard let imageProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
        }) else {
            completion(nil)
            return
        }

        imageProvider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
            var image: UIImage?

            if let img = data as? UIImage {
                image = img
            } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                image = img
            } else if let imgData = data as? Data {
                image = UIImage(data: imgData)
            }

            guard let original = image else {
                completion(nil)
                return
            }

            // Down-sample to max 512px on the longest side to keep payload small
            let maxSide: CGFloat = 512
            let scale = min(maxSide / max(original.size.width, original.size.height), 1.0)
            let newSize = CGSize(
                width:  original.size.width  * scale,
                height: original.size.height * scale
            )

            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            original.draw(in: CGRect(origin: .zero, size: newSize))
            let resized = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()

            guard let jpegData = resized?.jpegData(compressionQuality: 0.7) else {
                completion(nil)
                return
            }

            completion(jpegData.base64EncodedString())
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        // For anti-scraping platforms (Xiaohongshu, WeChat) include the image
        // inline in the URL scheme if it's small enough (≤ 60 KB base64 ≈ 45 KB JPEG).
        // Larger images go through the App Group fallback path instead.
        if let img = imageBase64, img.count <= 60_000 {
            components.queryItems?.append(URLQueryItem(name: "image", value: img))
        }

        guard let deepLink = components.url else {
            // URL build failed (likely because image is too large for the URL scheme)
            savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
            finish()
            return
        }

        // Open the main app with the deep link.
        // On iOS 13+, Share Extensions can open URLs via the responder chain.
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] success in
                    if !success {
                        // URL scheme open failed — fall back to App Group
                        self?.savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
                    }
                    self?.finish()
                }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let img = imageBase64 {
            defaults.set(img, forKey: "pendingShareImage")
        } else {
            defaults.removeObject(forKey: "pendingShareImage")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
