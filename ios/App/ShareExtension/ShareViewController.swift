import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot / image) from the iOS Share Sheet and
// opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is also captured (e.g. a Xiaohongshu post screenshot), it is
// compressed to a 1 200 px JPEG and stored as base64 in App Group UserDefaults
// under the key "pendingShareImage".  The deep-link includes hasImage=1 so
// CapacitorBridge knows to retrieve it.
//
// Supported source types: URLs, plain text containing a URL, images / screenshots.

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

        let group = DispatchGroup()
        var foundURL: String?
        var foundTitle: String?
        var foundImageData: Data?

        for item in items {
            guard let attachments = item.attachments else { continue }

            // ── Try to capture an image attachment (screenshot / thumbnail) ──────
            for attachment in attachments {
                let imageTypes = [
                    UTType.jpeg.identifier,
                    UTType.png.identifier,
                    UTType.image.identifier,
                ]
                guard imageTypes.contains(where: { attachment.hasItemConformingToTypeIdentifier($0) }) else { continue }

                let typeId = imageTypes.first { attachment.hasItemConformingToTypeIdentifier($0) } ?? UTType.image.identifier
                group.enter()
                attachment.loadItem(forTypeIdentifier: typeId) { data, _ in
                    defer { group.leave() }
                    if let image = data as? UIImage {
                        foundImageData = self.compressImage(image)
                    } else if let fileURL = data as? URL,
                              let image = UIImage(contentsOfFile: fileURL.path) {
                        foundImageData = self.compressImage(image)
                    } else if let raw = data as? Data,
                              let image = UIImage(data: raw) {
                        foundImageData = self.compressImage(image)
                    }
                }
                break
            }

            // ── Priority 1: direct URL attachment ────────────────────────────────
            for attachment in attachments {
                guard attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) else { continue }
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL, foundURL == nil {
                        foundURL   = url.absoluteString
                        foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                    }
                }
                break
            }

            // ── Priority 2: plain text that may contain a URL ────────────────────
            for attachment in attachments {
                guard attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) else { continue }
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                    defer { group.leave() }
                    if let text = data as? String,
                       let extracted = self.extractURL(from: text),
                       foundURL == nil {
                        foundURL   = extracted
                        foundTitle = text
                    }
                }
                break
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let imageData = foundImageData {
                let base64 = imageData.base64EncodedString()
                self.savePendingImageToAppGroup(base64: base64)
            }

            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "", hasImage: foundImageData != nil)
            } else {
                self.finish()
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private func compressImage(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 1200
        let size = image.size
        var newSize = size
        if size.width > maxDimension || size.height > maxDimension {
            let ratio = min(maxDimension / size.width, maxDimension / size.height)
            newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        }

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.75)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingImageToAppGroup(base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
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
