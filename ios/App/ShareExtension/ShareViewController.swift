import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + post text) from the iOS Share Sheet and opens
// the main TravelPanel app with:
//   travelpanel://share?url=<url>&title=<title>&text=<shareText>
//
// The `text` param carries the full post text from the share payload.
// For Xiaohongshu and WeChat (which block page scraping), this text is used
// directly by the AI extraction API so no content is lost.
//
// Supported source types: URLs, plain text containing a URL, web pages.

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
                            // Also capture any plain-text attachment (full post content)
                            self.extractPlainText(from: attachments) { capturedText in
                                self.openApp(url: url.absoluteString, title: title, shareText: capturedText)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 2: plain text that may contain a URL
            // (Xiaohongshu shares text containing the post description + URL)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            // Use first line (or ≤80 chars) as the display title
                            let title = self.extractTitle(from: text)
                            // Pass the full text as shareText for AI extraction
                            self.openApp(url: url, title: title, shareText: text)
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }
        }

        finish()
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private func extractPlainText(from attachments: [NSItemProvider], completion: @escaping (String?) -> Void) {
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                    completion(data as? String)
                }
                return
            }
        }
        completion(nil)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Extract a short, display-friendly title from the share text.
    // Uses the first non-empty line, capped at 80 characters.
    private func extractTitle(from text: String) -> String {
        let firstLine = text.components(separatedBy: "\n")
            .first { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            ?? text
        let trimmed = firstLine.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.count > 80 ? String(trimmed.prefix(80)) + "…" : trimmed
    }

    // ─── Open app ─────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, shareText: String? = nil) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let text = shareText, !text.isEmpty {
            // Cap at 2000 chars — deep-link URLs can be long but not infinite.
            // The API uses this content as a fallback when page scraping fails.
            let truncated = text.count > 2000 ? String(text.prefix(2000)) : text
            queryItems.append(URLQueryItem(name: "text", value: truncated))
        }
        components.queryItems = queryItems

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
        savePendingShareToAppGroup(url: url, title: title, shareText: shareText)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, shareText: String? = nil) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if let text = shareText {
            defaults.set(text, forKey: "pendingShareText")
        }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
