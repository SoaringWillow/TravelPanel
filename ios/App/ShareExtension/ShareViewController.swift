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
// Supported source types: URLs, plain text containing a URL, web pages, images.
//
// Image capture (for Xiaohongshu / WeChat anti-scraping fix):
// When a share payload includes an image (common on 小红书 which shares as
// image + text), we compress it and store it in the App Group container under
// the key "pendingShareImage".  The web layer reads this via the
// TravelPanelBridge Capacitor plugin (see ios/App/App/TravelPanelBridge/).
// If no plugin is present the image is silently skipped; URL+title still work.

private let appGroupID = "group.com.travelpanel.app"

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

            // Priority 1: a direct URL attachment (with optional image sidecar)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.captureImageIfPresent(attachments: attachments) {
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
                            self.captureImageIfPresent(attachments: attachments) {
                                self.openApp(url: url, title: text)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image-only share (e.g. screenshotted Xiaohongshu post)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage            { image = img }
                        else if let url = data as? URL           { image = UIImage(contentsOfFile: url.path) }
                        else                                     { image = nil }
                        if let img = image {
                            self.saveImageToAppGroup(img)
                        }
                        // No URL — open app without one so the user can add it manually
                        self.openApp(url: "", title: "Screenshot — tap to add URL")
                    }
                    return
                }
            }
        }

        finish()
    }

    // ── Image capture ────────────────────────────────────────────────────────

    private func captureImageIfPresent(attachments: [NSItemProvider], completion: @escaping () -> Void) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    let image: UIImage?
                    if let img = data as? UIImage           { image = img }
                    else if let url = data as? URL          { image = UIImage(contentsOfFile: url.path) }
                    else                                    { image = nil }
                    if let img = image { self?.saveImageToAppGroup(img) }
                    completion()
                }
                return
            }
        }
        completion()
    }

    // Compress the image and store as base64 JPEG in the App Group.
    // Capped at 1024 px on the longest side, JPEG quality 0.75 (~80–120 KB).
    // The web layer reads "pendingShareImage" via the TravelPanelBridge plugin.
    private func saveImageToAppGroup(_ image: UIImage) {
        let maxDim: CGFloat = 1024
        let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }

        guard let jpeg = resized.jpegData(compressionQuality: 0.75) else { return }
        let base64 = jpeg.base64EncodedString()

        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set(Date(), forKey: "pendingShareImageDate")
        defaults.synchronize()
    }

    // ── URL extraction ────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ──────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"

        var queryItems = [URLQueryItem(name: "title", value: title)]
        if !url.isEmpty { queryItems.insert(URLQueryItem(name: "url", value: url), at: 0) }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            savePendingShareToAppGroup(url: url, title: title)
            finish()
            return
        }

        // Open main app via responder chain (iOS 13+)
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

        // Fallback: persist to App Group for next-launch pick-up
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
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
