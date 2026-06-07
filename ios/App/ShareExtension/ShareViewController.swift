import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens
// the main TravelPanel app with travelpanel://share?url=...&title=...&hasImage=1.
// When an image is included (Xiaohongshu, WeChat, etc. that block og:image scraping),
// it is written to the App Group as base64 JPEG so the main app can pass it to
// Claude Vision for richer extraction.
//
// Priority order for attachments:
//   1. Direct URL attachment
//   2. Plain text that contains a URL
//   (image is loaded concurrently and written to App Group independently)

class ShareViewController: UIViewController {

    private let appGroupSuite = "group.com.travelpanel.app"
    private let imageMaxDimension: CGFloat = 1024
    private let imageJpegQuality: CGFloat = 0.72

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        // Use a dispatch group so we can wait for both URL and image (with a
        // hard deadline so a slow image load doesn't block opening the app).
        let group = DispatchGroup()
        var resolvedURL: String?
        var resolvedTitle: String?
        var resolvedImageBase64: String?

        for item in items {
            guard let attachments = item.attachments else { continue }

            // ── URL attachment ───────────────────────────────────────────────
            for attachment in attachments where
                attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    if let url = data as? URL {
                        resolvedURL = url.absoluteString
                        resolvedTitle = item.attributedContentText?.string ?? url.host ?? ""
                    }
                    group.leave()
                }
                break
            }

            // ── Text fallback ────────────────────────────────────────────────
            if resolvedURL == nil {
                for attachment in attachments where
                    attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            resolvedURL = url
                            resolvedTitle = text
                        }
                        group.leave()
                    }
                    break
                }
            }

            // ── Image attachment (concurrent, non-blocking) ──────────────────
            for attachment in attachments where
                attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
                attachment.hasItemConformingToTypeIdentifier("public.jpeg") ||
                attachment.hasItemConformingToTypeIdentifier("public.png") {
                group.enter()
                let typeId = attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier)
                    ? UTType.image.identifier : "public.jpeg"
                attachment.loadItem(forTypeIdentifier: typeId) { data, _ in
                    var image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                        image = img
                    } else if let raw = data as? Data {
                        image = UIImage(data: raw)
                    }
                    if let img = image {
                        resolvedImageBase64 = self.compressImage(img)
                    }
                    group.leave()
                }
                break
            }
        }

        // Wait up to 4 s for all attachments, then proceed regardless.
        let deadline = DispatchTime.now() + .seconds(4)
        group.notify(queue: .main) {
            self.handleResolved(url: resolvedURL,
                                title: resolvedTitle,
                                imageBase64: resolvedImageBase64)
        }
        DispatchQueue.global().asyncAfter(deadline: deadline) {
            // Timeout: proceed even if image hasn't loaded yet.
            // Note: calling notify after enter/leave pairs are unbalanced is a
            // no-op on an already-notified group — this is intentional.
            DispatchQueue.main.async {
                self.handleResolved(url: resolvedURL,
                                    title: resolvedTitle,
                                    imageBase64: resolvedImageBase64)
            }
        }
    }

    // Called once — either when all attachments resolve or when the timeout fires.
    // Uses a simple once-flag to avoid double execution.
    private var didHandleResolved = false
    private func handleResolved(url: String?, title: String?, imageBase64: String?) {
        guard !didHandleResolved else { return }
        didHandleResolved = true

        guard let url else { finish(); return }

        // Write image to App Group so the main app can read it.
        if let imageBase64 {
            savePendingImage(imageBase64)
        }

        openApp(url: url, title: title ?? "", hasImage: imageBase64 != nil)
    }

    // ── Image processing ─────────────────────────────────────────────────────

    private func compressImage(_ image: UIImage) -> String? {
        // Downscale to max 1024 on the long side (Claude Vision doesn't need more).
        let size = image.size
        let scale: CGFloat
        if size.width > size.height {
            scale = min(imageMaxDimension / size.width, 1.0)
        } else {
            scale = min(imageMaxDimension / size.height, 1.0)
        }
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpeg = (resized ?? image).jpegData(compressionQuality: imageJpegQuality) else {
            return nil
        }
        return jpeg.base64EncodedString()
    }

    // ── App Group helpers ─────────────────────────────────────────────────────

    private func savePendingImage(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(url,    forKey: "pendingShareURL")
        defaults.set(title,  forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if hasImage { defaults.set("1", forKey: "pendingShareHasImage") }
        defaults.synchronize()
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: App Group (main app reads on next launch)
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
