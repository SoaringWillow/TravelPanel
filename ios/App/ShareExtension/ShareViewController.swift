import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&imgB64=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// The imgB64 param carries a base64url-encoded JPEG screenshot (512px max, quality 0.5).
// The web layer uses it for Claude Vision extraction on platforms like Xiaohongshu
// and WeChat that block page scraping.

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
        let lock = NSLock()
        var foundURL: String?
        var foundTitle: String?
        var foundImage: UIImage?

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Collect URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        guard let url = data as? URL else { return }
                        lock.lock()
                        if foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                        lock.unlock()
                    }
                }

                // Collect plain text (may contain URL if no direct URL attachment)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let text = data as? String,
                              let extracted = self?.extractURL(from: text) else { return }
                        lock.lock()
                        if foundURL == nil {
                            foundURL = extracted
                            foundTitle = text
                        }
                        lock.unlock()
                    }
                }

                // Collect image attachment (Xiaohongshu / WeChat often share a post screenshot)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        var img: UIImage?
                        if let direct = data as? UIImage {
                            img = direct
                        } else if let bytes = data as? Data {
                            img = UIImage(data: bytes)
                        } else if let fileURL = data as? URL,
                                  let bytes = try? Data(contentsOf: fileURL) {
                            img = UIImage(data: bytes)
                        }
                        guard let resolved = img else { return }
                        lock.lock()
                        if foundImage == nil { foundImage = resolved }
                        lock.unlock()
                    }
                }
            }
        }

        group.notify(queue: .global(qos: .userInitiated)) { [weak self] in
            guard let self else { return }
            guard let url = foundURL else {
                self.finish()
                return
            }
            let imgB64url = foundImage.flatMap { self.encodeImage($0) }
            self.openApp(url: url, title: foundTitle ?? "", imageBase64url: imgB64url)
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resize image to ≤ 512px (max dimension), encode as JPEG @ 50% quality,
    // then base64url-encode (no + / = characters — safe in URL query params without percent-encoding).
    private func encodeImage(_ image: UIImage, maxDim: CGFloat = 512) -> String? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }

        let scale = min(maxDim / size.width, maxDim / size.height, 1.0)
        let newSize = CGSize(width: floor(size.width * scale), height: floor(size.height * scale))

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.5) else { return nil }

        // base64url: replaces + → -, / → _, strips = padding
        return jpegData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func openApp(url: String, title: String, imageBase64url: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let imgB64 = imageBase64url {
            queryItems.append(URLQueryItem(name: "imgB64", value: imgB64))
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

        // Fallback: write to App Group and let the main app pick it up on next launch.
        // Note: the image is not included in the App Group fallback (URL length limits don't apply
        // but the Preferences-based fallback path doesn't carry binary data).
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
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
