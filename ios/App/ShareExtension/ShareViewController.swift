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
// Supported source types:
//   1. Direct URL attachment
//   2. Plain text containing a URL
//   3. Image (e.g. Xiaohongshu screenshot) — written to App Group for Claude Vision

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
                            // Also grab any accompanying image in the same item (Xiaohongshu sends both)
                            self.extractImage(from: attachments) { imageData in
                                self.openApp(url: url.absoluteString, title: title, imageData: imageData)
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
                            self.openApp(url: url, title: text, imageData: nil)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image only (screenshot shared directly — no URL)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            self.finish()
                            return
                        }
                        let jpeg = image?.jpegData(compressionQuality: 0.6).map { Data($0) }
                        let b64  = jpeg?.base64EncodedString()
                        // Use a placeholder URL so the share page still opens
                        self.openApp(url: "travelpanel://vision-only", title: "Screenshot", imageData: b64)
                    }
                    return
                }
            }
        }

        finish()
    }

    // Attempts to extract the first image attachment from a set of providers.
    // Calls completion with nil if no image is found or extraction fails.
    private func extractImage(from attachments: [NSItemProvider], completion: @escaping (String?) -> Void) {
        for attachment in attachments {
            guard attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) else { continue }
            attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                let image: UIImage?
                if let img = data as? UIImage {
                    image = img
                } else if let url = data as? URL {
                    image = UIImage(contentsOfFile: url.path)
                } else {
                    image = nil
                }
                // Compress to ~500 KB JPEG to keep App Group storage manageable
                let b64 = image?.jpegData(compressionQuality: 0.55).map { Data($0).base64EncodedString() }
                completion(b64 ?? nil)
            }
            return
        }
        completion(nil)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, imageData: String?) {
        // Write image to App Group before opening (image is too large for URL params).
        // CapacitorBridge reads this on app resume and stores it in sessionStorage.
        if let imageData {
            savePendingShareToAppGroup(url: url, title: title, imageData: imageData)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",      value: url),
            URLQueryItem(name: "title",    value: title),
            URLQueryItem(name: "hasImage", value: imageData != nil ? "1" : nil),
        ].compactMap { $0.value != nil ? $0 : nil }

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
        savePendingShareToAppGroup(url: url, title: title, imageData: imageData)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageData: String?) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,       forKey: "pendingShareURL")
        defaults.set(title,     forKey: "pendingShareTitle")
        defaults.set(Date(),    forKey: "pendingShareDate")
        if let imageData {
            defaults.set(imageData, forKey: "pendingShareImageData")
        } else {
            defaults.removeObject(forKey: "pendingShareImageData")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
