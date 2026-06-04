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
// Supported source types: URLs, plain text containing a URL, web pages,
// and images (e.g. screenshots of Xiaohongshu / WeChat posts where HTML
// scraping is blocked — the image is stored in App Group for Claude Vision).

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
                            // Also capture any image sibling in the same item for vision enrichment
                            self.captureImageIfPresent(from: attachments) {
                                self.openApp(url: url.absoluteString, title: title)
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
                            self.captureImageIfPresent(from: attachments) {
                                self.openApp(url: url, title: text)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: pure image share (e.g. screenshot of a Xiaohongshu post)
            // Use the post's web URL as a placeholder; vision enrichment provides the content.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            self.finish()
                            return
                        }
                        if let img = image {
                            self.storeImageForVision(img)
                            // Use a synthetic placeholder URL so the share flow can identify this clip
                            let placeholder = "travelpanel://image-clip?ts=\(Int(Date().timeIntervalSince1970))"
                            let title = item.attributedContentText?.string ?? "Image clip"
                            self.openApp(url: placeholder, title: title)
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

    // Looks for an image attachment alongside a URL/text attachment and stores it
    // in the App Group for Claude Vision enrichment (non-blocking — calls completion either way).
    private func captureImageIfPresent(
        from attachments: [NSItemProvider],
        completion: @escaping () -> Void
    ) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    if let img = data as? UIImage {
                        self?.storeImageForVision(img)
                    } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                        self?.storeImageForVision(img)
                    }
                    completion()
                }
                return
            }
        }
        // No image attachment found — proceed immediately
        completion()
    }

    // Compresses the image to a small JPEG and stores base64 in App Group UserDefaults
    // so the web layer can include it in the Claude Vision enrichment request.
    private func storeImageForVision(_ image: UIImage) {
        // Scale down to max 1024 wide to keep the payload manageable
        let maxDim: CGFloat = 1024
        let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }

        guard let jpeg = resized.jpegData(compressionQuality: 0.75) else { return }
        // Skip if compressed image is still too large (> 400 KB) to avoid slow API calls
        guard jpeg.count <= 400_000 else { return }

        let base64 = jpeg.base64EncodedString()
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
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
