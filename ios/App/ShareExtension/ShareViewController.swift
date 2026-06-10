import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives content from the iOS Share Sheet and opens the main app via the
// travelpanel://share?url=...&title=[&hasImage=1] URL scheme.
//
// Supported source types (in order of priority):
//   1. Direct URL attachment          → reads URL, extracts title
//   2. Plain text containing a URL   → extracts URL via NSDataDetector
//   3. Image (UIImage / PNG / JPEG)  → compresses + saves to App Group;
//                                       sets hasImage=1 in the URL scheme
//      Images are used by Claude Vision for Xiaohongshu and other platforms
//      that block web scraping.
//
// When a URL and image are both present (e.g. shared from Xiaohongshu),
// the URL scheme includes both the url= param and hasImage=1.

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

        var sharedURL: String?
        var sharedTitle: String?
        var imageAttachment: NSItemProvider?

        // Scan all attachments to collect URL + optional image
        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                if sharedURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    sharedURL = nil  // handled asynchronously below
                    let titleCandidate = item.attributedContentText?.string ?? ""
                    if !titleCandidate.isEmpty { sharedTitle = titleCandidate }
                    // Prioritise URL extraction — grab it first
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        if let url = data as? URL {
                            self?.openApp(url: url.absoluteString, title: sharedTitle ?? url.host ?? "", imageAttachment: imageAttachment)
                        } else {
                            self?.finish()
                        }
                    }
                    return
                }

                if imageAttachment == nil &&
                    (attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) ||
                     attachment.hasItemConformingToTypeIdentifier("public.jpeg") ||
                     attachment.hasItemConformingToTypeIdentifier("public.png")) {
                    imageAttachment = attachment
                }
            }
        }

        // Priority 2: plain text containing a URL
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.openApp(url: url, title: text, imageAttachment: imageAttachment)
                        } else if imageAttachment != nil {
                            // Image only — no URL found; use a placeholder URL
                            self.openApp(url: "about:blank", title: "Saved image", imageAttachment: imageAttachment)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }

        // Priority 3: image only (no URL or text)
        if let img = imageAttachment {
            img.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                guard let self else { return }
                let image: UIImage?
                if let uiImage = data as? UIImage {
                    image = uiImage
                } else if let url = data as? URL, let loaded = UIImage(contentsOfFile: url.path) {
                    image = loaded
                } else {
                    image = nil
                }
                if let image {
                    self.openAppWithImageOnly(image: image)
                } else {
                    self.finish()
                }
            }
            return
        }

        finish()
    }

    // Open the app with a URL, attaching a compressed image to App Group if available
    private func openApp(url: String, title: String, imageAttachment: NSItemProvider?) {
        guard let imageAttachment else {
            openApp(url: url, title: title)
            return
        }

        let typeId = imageAttachment.hasItemConformingToTypeIdentifier(UTType.image.identifier)
            ? UTType.image.identifier
            : (imageAttachment.hasItemConformingToTypeIdentifier("public.jpeg") ? "public.jpeg" : "public.png")

        imageAttachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
            guard let self else { return }
            let image: UIImage?
            if let uiImage = data as? UIImage {
                image = uiImage
            } else if let fileURL = data as? URL, let loaded = UIImage(contentsOfFile: fileURL.path) {
                image = loaded
            } else {
                image = nil
            }

            if let image, let base64 = self.compressImage(image) {
                self.saveImageToAppGroup(base64)
                self.openApp(url: url, title: title, hasImage: true)
            } else {
                self.openApp(url: url, title: title, hasImage: false)
            }
        }
    }

    // Image-only share (e.g. screenshot from Photos app)
    private func openAppWithImageOnly(image: UIImage) {
        guard let base64 = compressImage(image) else { finish(); return }
        saveImageToAppGroup(base64)
        openApp(url: "about:blank", title: "Saved screenshot", hasImage: true)
    }

    // ── Core URL scheme opener ────────────────────────────────────────────────

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
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

    // ── Image helpers ─────────────────────────────────────────────────────────

    private func compressImage(_ image: UIImage) -> String? {
        // Resize to max 1024px on the longest side to keep payload under ~500KB
        let maxDimension: CGFloat = 1024
        let scale = min(maxDimension / max(image.size.width, image.size.height), 1.0)
        let newSize = scale < 1.0
            ? CGSize(width: image.size.width * scale, height: image.size.height * scale)
            : image.size

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        var quality: CGFloat = 0.75
        var data = resized.jpegData(compressionQuality: quality)

        // Reduce quality until under 500KB
        while let d = data, d.count > 500_000, quality > 0.2 {
            quality -= 0.15
            data = resized.jpegData(compressionQuality: quality)
        }

        return data?.base64EncodedString()
    }

    private func saveImageToAppGroup(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.synchronize()
    }

    // ── Text / fallback helpers ───────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
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
