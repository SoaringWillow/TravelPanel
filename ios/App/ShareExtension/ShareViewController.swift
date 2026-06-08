import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// For anti-scraping platforms (Xiaohongshu, WeChat, Douyin), it also captures
// any shared image attachment and stores it in the App Group as base64 JPEG.
// CapacitorBridge reads the image and passes it to Claude Vision via /api/import.
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

        // We may receive both a URL/text and an image in the same share payload.
        // Collect them concurrently using a dispatch group, then open the app once both are ready.
        let group = DispatchGroup()

        var sharedURL: String?
        var sharedTitle: String?
        var sharedImageData: Data?

        for item in items {
            guard let attachments = item.attachments else { continue }

            // ── URL attachment ────────────────────────────────────────────────
            for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL {
                        sharedURL   = url.absoluteString
                        sharedTitle = item.attributedContentText?.string ?? url.host ?? ""
                    }
                }
            }

            // ── Plain text (may contain a URL) ────────────────────────────────
            for attachment in attachments where
                sharedURL == nil &&
                attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self else { return }
                    if let text = data as? String, let url = self.extractURL(from: text) {
                        sharedURL   = url
                        sharedTitle = text
                    }
                }
            }

            // ── Image attachment (screenshot / post preview) ──────────────────
            // Capture the first image; compress to JPEG 720px wide to keep the
            // App Group payload manageable (<150 KB typically).
            for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                    defer { group.leave() }
                    var image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                        image = img
                    } else if let data = data as? Data, let img = UIImage(data: data) {
                        image = img
                    }
                    guard let img = image else { return }

                    // Downscale to 720px wide to keep base64 payload reasonable
                    let maxWidth: CGFloat = 720
                    let scale = img.size.width > maxWidth ? maxWidth / img.size.width : 1.0
                    let targetSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
                    UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
                    img.draw(in: CGRect(origin: .zero, size: targetSize))
                    let resized = UIGraphicsGetImageFromCurrentImageContext()
                    UIGraphicsEndImageContext()

                    sharedImageData = resized?.jpegData(compressionQuality: 0.7)
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let url = sharedURL {
                self.openApp(url: url, title: sharedTitle ?? "", imageData: sharedImageData)
            } else if let imageData = sharedImageData {
                // Image-only share (e.g. screenshot saved from Xiaohongshu)
                // Use a placeholder URL so the share page still opens
                self.openApp(url: "travelpanel://image-share", title: "Shared image", imageData: imageData)
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

    private func openApp(url: String, title: String, imageData: Data?) {
        // Persist the screenshot (if any) to App Group preferences before opening the app.
        // CapacitorBridge reads it on the appUrlOpen event and moves it to sessionStorage.
        var hasImage = false
        if let data = imageData {
            let base64 = "data:image/jpeg;base64," + data.base64EncodedString()
            if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(base64, forKey: "pendingShareImage")
                defaults.synchronize()
                hasImage = true
            }
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            queryItems.append(URLQueryItem(name: "hasImage", value: "true"))
        }
        components.queryItems = queryItems

        guard let deepLink = components.url else {
            finish()
            return
        }

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

        // Fallback: write URL to App Group for main app to pick up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
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
