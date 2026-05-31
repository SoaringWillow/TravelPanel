import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=... URL
// scheme, which the CapacitorBridge component routes to /share.
//
// When an image attachment is present (e.g. a Xiaohongshu screenshot or preview),
// it is compressed and written to App Group UserDefaults as 'pendingShareImage'
// (base64 JPEG). CapacitorBridge reads this key on appUrlOpen and passes it to the
// enrichment API for Claude Vision extraction.
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

        // Flatten all attachments from all items
        let allAttachments: [NSItemProvider] = items.flatMap { $0.attachments ?? [] }
        let titleText = items.first?.attributedContentText?.string ?? ""

        let group = DispatchGroup()
        var resolvedURL: String?
        var resolvedImage: UIImage?

        // ── Extract URL (priority: kUTTypeURL > plain text with embedded URL) ──

        if let urlProvider = allAttachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
        }) {
            group.enter()
            urlProvider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                if let url = data as? URL {
                    resolvedURL = url.absoluteString
                }
                group.leave()
            }
        } else if let textProvider = allAttachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier)
        }) {
            group.enter()
            textProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                if let text = data as? String {
                    resolvedURL = self?.extractURL(from: text) ?? (text.isEmpty ? nil : text)
                }
                group.leave()
            }
        }

        // ── Extract image (used for Vision enrichment on platforms like Xiaohongshu) ──

        if let imageProvider = allAttachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
        }) {
            group.enter()
            imageProvider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                if let image = data as? UIImage {
                    resolvedImage = image
                } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                    resolvedImage = image
                } else if let data = data as? Data, let image = UIImage(data: data) {
                    resolvedImage = image
                }
                group.leave()
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Write compressed image to App Group so CapacitorBridge can forward it
            if let image = resolvedImage,
               let base64 = image.compressedBase64(maxDimension: 1024, quality: 0.75),
               let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                defaults.set(base64, forKey: "pendingShareImage")
                defaults.synchronize()
            }

            if let url = resolvedURL {
                self.openApp(url: url, title: titleText)
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

        // Fallback: write URL to App Group and let the main app pick it up on next launch
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

// ─── UIImage compression helper ─────────────────────────────────────────────

private extension UIImage {
    /// Scale down to maxDimension × maxDimension (preserving aspect ratio),
    /// then JPEG-compress and base64-encode. Returns nil on failure.
    func compressedBase64(maxDimension: CGFloat, quality: CGFloat) -> String? {
        let originalSize = size
        let scale = min(maxDimension / max(originalSize.width, originalSize.height), 1.0)
        let targetSize = CGSize(
            width:  (originalSize.width  * scale).rounded(),
            height: (originalSize.height * scale).rounded()
        )

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let scaled = renderer.image { _ in
            self.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        guard let data = scaled.jpegData(compressionQuality: quality) else { return nil }
        return data.base64EncodedString()
    }
}
