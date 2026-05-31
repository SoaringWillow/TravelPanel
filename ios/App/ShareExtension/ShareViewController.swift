import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app with a travelpanel://share?url=...&title=...&imgb64=...
// deep link, which CapacitorBridge routes to /share.
//
// Priority 0: image attachments (Xiaohongshu screenshots, etc.)
//   → compressed to 128×128 JPEG, base64-encoded, passed as imgb64 param
//   → web app uses Claude Vision for extraction instead of scraping
// Priority 1: direct URL attachment
// Priority 2: plain text containing a URL

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

        // Flatten all (attachment, item) pairs for multi-priority processing
        var pairs: [(NSItemProvider, NSExtensionItem)] = []
        for item in items {
            for attachment in item.attachments ?? [] {
                pairs.append((attachment, item))
            }
        }

        // Priority 0: image attachment (e.g. Xiaohongshu screenshot)
        for (attachment, item) in pairs {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { return }

                    let image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let fileURL = data as? URL, let img = UIImage(contentsOfFile: fileURL.path) {
                        image = img
                    } else {
                        image = nil
                    }

                    // Compress to 128×128 JPEG — keeps base64 under ~8 KB so it fits in the URL scheme
                    var imgb64: String? = nil
                    if let img = image {
                        let maxDim: CGFloat = 128
                        let scale = min(maxDim / img.size.width, maxDim / img.size.height, 1)
                        let thumbSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
                        let thumb = img.preparingThumbnail(of: thumbSize) ?? img
                        imgb64 = thumb.jpegData(compressionQuality: 0.6)?.base64EncodedString()
                    }

                    // Extract a URL from the item's text (if available)
                    let rawText = item.attributedContentText?.string ?? ""
                    let url = self.extractURL(from: rawText) ?? "travelpanel://image-share"
                    self.openApp(url: url, title: rawText, imgb64: imgb64)
                }
                return
            }
        }

        // Priority 1: direct URL attachment
        for (attachment, item) in pairs {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let url = data as? URL {
                        let title = item.attributedContentText?.string ?? url.host ?? ""
                        self.openApp(url: url.absoluteString, title: title)
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        // Priority 2: plain text that may contain a URL
        for (attachment, _) in pairs {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let text = data as? String, let url = self.extractURL(from: text) {
                        self.openApp(url: url, title: text)
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        finish()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imgb64: String? = nil) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let imgb64 {
            queryItems.append(URLQueryItem(name: "imgb64", value: imgb64))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app via URL scheme (iOS 13+: use responder chain)
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

        // Fallback: write to App Group so main app can read on next launch
        savePendingShareToAppGroup(url: url, title: title, imgb64: imgb64)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imgb64: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let imgb64 {
            defaults.set(imgb64, forKey: "pendingShareImageData")
        } else {
            defaults.removeObject(forKey: "pendingShareImageData")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
