import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional image) from the iOS Share Sheet and opens the main
// TravelPanel app with the travelpanel://share?url=...&title=... URL scheme.
//
// When an image attachment is present (e.g. a Xiaohongshu screenshot or card),
// it is compressed and written to the shared App Group so the web layer can pass
// it to Claude Vision — enabling extraction even when URL scraping is blocked.
//
// Supported source types: URLs, plain text containing a URL, images (with or
// without an accompanying URL).

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        var foundURL: String?
        var foundTitle: String?
        var foundImage: UIImage?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Priority 1: direct URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }

                // Priority 2: image attachment (screenshot, post card, etc.)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        guard foundImage == nil else { return }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let data = data as? Data {
                            foundImage = UIImage(data: data)
                        }
                    }
                }

                // Priority 3: plain text as fallback URL source
                if !attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) &&
                    attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String, foundURL == nil,
                           let url = self?.extractURL(from: text) {
                            foundURL = url
                            foundTitle = text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            let imageBase64 = foundImage.flatMap { self.compressImage($0) }
            let url   = foundURL ?? ""
            let title = foundTitle ?? ""

            guard !url.isEmpty || imageBase64 != nil else {
                self.finish(); return
            }

            self.openApp(url: url, title: title, imageBase64: imageBase64)
        }
    }

    // ── Image compression ─────────────────────────────────────────────────────
    // Scales to max 640 px on the long edge, then JPEG-encodes.
    // Targets < 150 KB to stay well under UserDefaults per-key budget.

    private func compressImage(_ image: UIImage) -> String? {
        let maxDim: CGFloat = 640
        var target = image

        if image.size.width > maxDim || image.size.height > maxDim {
            let scale = min(maxDim / image.size.width, maxDim / image.size.height)
            let newSize = CGSize(
                width:  floor(image.size.width  * scale),
                height: floor(image.size.height * scale)
            )
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            target = UIGraphicsGetImageFromCurrentImageContext() ?? image
            UIGraphicsEndImageContext()
        }

        let quality: CGFloat = target.jpegData(compressionQuality: 0.6).map {
            $0.count < 150_000 ? 0.6 : 0.3
        } ?? 0.4

        guard let jpeg = target.jpegData(compressionQuality: quality) else { return nil }
        return jpeg.base64EncodedString()
    }

    // ── URL extraction from plain text ────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App opening ───────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String? = nil) {
        // Write everything to App Group first — the image is too large for the URL scheme.
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // URL scheme open failed — App Group fallback is already written above.
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String? = nil) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,         forKey: "pendingShareURL")
        defaults.set(title,       forKey: "pendingShareTitle")
        defaults.set(Date(),      forKey: "pendingShareDate")
        if let b64 = imageBase64 {
            defaults.set(b64, forKey: "pendingShareImageBase64")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
