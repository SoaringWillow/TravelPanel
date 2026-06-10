import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// When an image is also shared (e.g. a Xiaohongshu screenshot), it is saved to the
// App Group shared container so the main app can read it on next launch and pass it
// to the /api/import vision path.  See CapacitorBridge.tsx for the read-side.
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

        var foundURL: String?
        var foundTitle: String?
        var foundImage: UIImage?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Capture the title from the item's attributed text
            if let text = item.attributedContentText?.string, !text.isEmpty {
                foundTitle = foundTitle ?? text
            }

            for attachment in attachments {
                // Image attachment (screenshot shared from Xiaohongshu etc.)
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let img = data as? UIImage {
                            foundImage = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            foundImage = img
                        }
                    }
                }

                // URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                            if foundTitle == nil {
                                foundTitle = url.host ?? ""
                            }
                        }
                    }
                }

                // Plain text (may contain a URL)
                if foundURL == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String {
                            if let extracted = self.extractURL(from: text) {
                                foundURL = extracted
                            }
                            foundTitle = foundTitle ?? text
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let image = foundImage {
                self.saveImageToAppGroup(image)
            }

            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "", hasImage: foundImage != nil)
            } else if foundImage != nil {
                // Image shared without a URL — open share page with placeholder
                self.openApp(url: "travelpanel://screenshot", title: foundTitle ?? "Screenshot", hasImage: true)
            } else {
                self.finish()
            }
        }
    }

    // ── Image storage ─────────────────────────────────────────────────────────

    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app"),
              let jpeg = image.jpegData(compressionQuality: 0.7) else { return }
        let base64 = jpeg.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.set("image/jpeg", forKey: "pendingShareImageMimeType")
        defaults.set(Date(), forKey: "pendingShareImageDate")
        defaults.synchronize()
    }

    // ── URL extraction ────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── Deep-link open ────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

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

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchGroup().notify(queue: .main) {}
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
