import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot image) from the iOS Share Sheet and
// opens the main TravelPanel app via the travelpanel://share URL scheme.
//
// For anti-scrape platforms (Xiaohongshu, WeChat) where server-side HTML fetching
// returns empty content, this extension also captures the post image and stores it
// in the App Group so the web layer can send it to Claude Vision for extraction.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Main extraction ──────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        let group = DispatchGroup()
        var extractedURL: String?
        var extractedTitle: String?
        var extractedImageBase64: String?

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // URL attachment
                if extractedURL == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            extractedURL   = url.absoluteString
                            extractedTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                }

                // Plain-text fallback (may contain a URL)
                if extractedURL == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String,
                           let url = self?.extractURL(from: text) {
                            extractedURL   = url
                            extractedTitle = text
                        }
                    }
                }

                // Image attachment — captured for Claude Vision (Xiaohongshu / WeChat fix)
                if extractedImageBase64 == nil,
                   attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL,
                                  let fileData = try? Data(contentsOf: url) {
                            image = UIImage(data: fileData)
                        } else {
                            image = nil
                        }
                        // Compress aggressively; skip if still > 900 KB to avoid oversized App Group entries
                        if let img = image,
                           let jpeg = img.jpegData(compressionQuality: 0.35),
                           jpeg.count < 900_000 {
                            extractedImageBase64 = jpeg.base64EncodedString()
                        }
                    }
                }
            }
        }

        // Wait up to 6 seconds for all attachments, then open the app.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            _ = group.wait(timeout: .now() + 6)
            DispatchQueue.main.async {
                guard let self else { return }
                guard let url = extractedURL else { self.finish(); return }

                // Persist image to App Group so CapacitorBridge can retrieve it.
                if let b64 = extractedImageBase64 {
                    self.saveToAppGroup(key: "pendingShareImage", value: b64)
                }

                self.openApp(url: url, title: extractedTitle ?? "")
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func saveToAppGroup(key: String, value: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(value, forKey: key)
        defaults.synchronize()
    }

    private func openApp(url: String, title: String) {
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

        // Fallback: persist everything to App Group and let the app pick it up on next launch.
        saveToAppGroup(key: "pendingShareURL",   value: url)
        saveToAppGroup(key: "pendingShareTitle", value: title)
        finish()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
