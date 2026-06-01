import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot image) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is present alongside a URL (common on Xiaohongshu / WeChat which
// block server-side scraping), it is written to the App Group as base64 JPEG so the
// main app can pass it to Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

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

        // First pass: collect the best URL/text/image provider across all items
        var urlProvider: (NSItemProvider, NSExtensionItem)?
        var textProvider: NSItemProvider?
        var imageProvider: NSItemProvider?

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if urlProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    urlProvider = (attachment, item)
                }
                if textProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    textProvider = attachment
                }
                if imageProvider == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    imageProvider = attachment
                }
            }
        }

        // Second pass: load all found providers in parallel, then open the app
        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImage: UIImage?

        if let (attachment, item) = urlProvider {
            group.enter()
            attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    extractedURL   = url.absoluteString
                    extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                }
                group.leave()
            }
        } else if let attachment = textProvider {
            group.enter()
            attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                if let text = data as? String, let url = self?.extractURL(from: text) {
                    extractedURL   = url
                    extractedTitle = text
                }
                group.leave()
            }
        }

        // Image extraction runs in parallel with URL extraction
        if let attachment = imageProvider {
            group.enter()
            attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                extractedImage = data as? UIImage
                group.leave()
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Write compressed JPEG to App Group so the main app can pass it to
            // Claude Vision (especially useful for Xiaohongshu / WeChat anti-scraping).
            if let image = extractedImage,
               let jpeg = image.jpegData(compressionQuality: 0.5),
               jpeg.count < 3_000_000,
               let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(jpeg.base64EncodedString(), forKey: "pendingShareImageBase64")
                defaults.synchronize()
            }

            if let url = extractedURL {
                self.openApp(url: url, title: extractedTitle ?? "")
            } else {
                self.finish()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Open the main app with the deep link.
        // On iOS 13+, Share Extensions can open URLs via the responder chain.
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
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios-setup.md for configuration instructions.
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
