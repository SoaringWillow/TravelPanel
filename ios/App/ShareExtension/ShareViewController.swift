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
// For anti-scrape platforms (Xiaohongshu, WeChat) that block URL fetching,
// any shared image/screenshot is also captured and written to App Group
// UserDefaults as "pendingShareImageBase64". The web layer reads it during
// enrichment and uses Claude Vision to extract content from the image.
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
                            // Capture screenshot for anti-scrape platforms (fire-and-forget)
                            self.captureImageIfNeeded(from: attachments, urlString: url.absoluteString)
                            self.openApp(url: url.absoluteString, title: title)
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
                            self.captureImageIfNeeded(from: attachments, urlString: url)
                            self.openApp(url: url, title: text)
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

    // ── Anti-scrape image capture ─────────────────────────────────────────────

    /// Platforms that block server-side URL fetching — image capture fills the gap.
    private func isAntiScrapePlatform(_ urlString: String) -> Bool {
        let lower = urlString.lowercased()
        return lower.contains("xiaohongshu.com")
            || lower.contains("xhslink.com")
            || lower.contains("xhs.link")
            || lower.contains("weixin.qq.com")
            || lower.contains("mp.weixin")
    }

    /// If the URL is from an anti-scrape platform, find the first image attachment,
    /// scale it down, and persist it as base64 JPEG to the App Group for Vision use.
    private func captureImageIfNeeded(from attachments: [NSItemProvider], urlString: String) {
        guard isAntiScrapePlatform(urlString) else { return }

        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    var image: UIImage?
                    if let uiImage = data as? UIImage {
                        image = uiImage
                    } else if let url = data as? URL {
                        image = UIImage(contentsOfFile: url.path)
                    } else if let raw = data as? Data {
                        image = UIImage(data: raw)
                    }
                    if let img = image {
                        self.savePendingShareImage(img)
                    }
                }
                return
            }
        }
    }

    /// Scale the image to ≤ 768 px on its longest side, encode as JPEG, and
    /// write the base64 string to App Group UserDefaults.
    private func savePendingShareImage(_ image: UIImage) {
        let maxDimension: CGFloat = 768
        let scaled = image.scaledToFit(maxDimension: maxDimension)
        guard let jpegData = scaled.jpegData(compressionQuality: 0.65) else { return }
        let base64 = jpegData.base64EncodedString()
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
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

// ── UIImage helpers ────────────────────────────────────────────────────────────

private extension UIImage {
    /// Returns a copy scaled so that neither dimension exceeds `maxDimension`.
    /// Returns self unchanged if already within bounds.
    func scaledToFit(maxDimension: CGFloat) -> UIImage {
        let ratio = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        if ratio >= 1.0 { return self }
        let newSize = CGSize(width: (size.width * ratio).rounded(), height: (size.height * ratio).rounded())
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in self.draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
