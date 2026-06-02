import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/screenshot) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For Xiaohongshu/WeChat posts that block server-side fetching, the extension
// also captures any image attachment, resizes it, and stores it in the App Group
// under 'pendingShareImage'. The main app reads it and passes it to Claude Vision.
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

        var foundUrl: String?
        var foundTitle: String?
        var foundImage: UIImage?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }
            let itemTitle = item.attributedContentText?.string ?? ""

            for attachment in attachments {
                // Priority 1: direct URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundUrl == nil {
                            foundUrl = url.absoluteString
                            if foundTitle == nil {
                                foundTitle = itemTitle.isEmpty ? (url.host ?? "") : itemTitle
                            }
                        }
                    }
                }

                // Priority 2: plain text containing a URL
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String,
                           let url = self?.extractURL(from: text),
                           foundUrl == nil {
                            foundUrl = url
                            if foundTitle == nil {
                                foundTitle = itemTitle.isEmpty ? text : itemTitle
                            }
                        }
                    }
                }

                // Collect image (screenshot / post image) for Vision extraction
                else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier),
                        foundImage == nil {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let url = data as? URL {
                            foundImage = UIImage(contentsOfFile: url.path)
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = foundUrl else {
                self.finish()
                return
            }

            let hasImage = foundImage != nil
            if let image = foundImage {
                self.saveImageToAppGroup(image)
            }
            self.openApp(url: url, title: foundTitle ?? "", hasImage: hasImage)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resizes to max 800px on longest side and stores as base64 JPEG in the App Group.
    private func saveImageToAppGroup(_ image: UIImage) {
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(
            width:  (image.size.width  * scale).rounded(),
            height: (image.size.height * scale).rounded()
        )
        let resized = UIGraphicsImageRenderer(size: newSize).image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpeg = resized.jpegData(compressionQuality: 0.72),
              let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        defaults.set(jpeg.base64EncodedString(), forKey: "pendingShareImage")
        defaults.synchronize()
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url",   value: url),
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
        // Note: pendingShareImage is already written by saveImageToAppGroup above
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
