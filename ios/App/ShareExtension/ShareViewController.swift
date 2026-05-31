import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title/screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// Supported source types: URLs, plain text containing a URL, web pages.
//
// Image handling: Platforms like Xiaohongshu block web scraping. When the Share Sheet
// also provides a preview image (common when sharing a post), we compress it and store
// it in the App Group so the web layer can pass it to the Claude Vision import path.

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

        var resolvedURL: String?
        var resolvedTitle: String?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Extract URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            resolvedURL = url.absoluteString
                            resolvedTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                    break
                }
            }

            // Extract preview image (stored in App Group for Claude Vision)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        self?.saveImageToAppGroup(data)
                    }
                    break
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            if let url = resolvedURL {
                self.openApp(url: url, title: resolvedTitle ?? "")
                return
            }

            // Fallback: scan plain text attachments for a URL
            self.extractURLFromText(items: items) { [weak self] result in
                guard let self else { return }
                if let (url, title) = result {
                    self.openApp(url: url, title: title)
                } else {
                    self.finish()
                }
            }
        }
    }

    // MARK: - Image handling

    private func saveImageToAppGroup(_ data: Any?) {
        var rawData: Data?

        if let fileURL = data as? URL, fileURL.isFileURL {
            rawData = try? Data(contentsOf: fileURL)
        } else if let image = data as? UIImage {
            rawData = image.jpegData(compressionQuality: 0.65)
        }

        guard let imageData = rawData,
              let image = UIImage(data: imageData) else { return }

        let resized = resizeImage(image, maxDimension: 800)
        guard let jpeg = resized.jpegData(compressionQuality: 0.65) else { return }

        // Skip oversized images (> 600 KB raw = ~820 KB base64) to avoid filling UserDefaults
        guard jpeg.count < 614_400 else { return }

        let base64 = jpeg.base64EncodedString()

        if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
            defaults.set(base64, forKey: "pendingShareImageBase64")
            defaults.synchronize()
        }
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let largest = max(size.width, size.height)
        guard largest > maxDimension else { return image }

        let scale = maxDimension / largest
        let newSize = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())

        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    // MARK: - URL / text fallback

    private func extractURLFromText(
        items: [NSExtensionItem],
        completion: @escaping ((String, String)?) -> Void
    ) {
        var found = false

        for item in items {
            guard let attachments = item.attachments, !found else { break }

            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    found = true
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        if let text = data as? String,
                           let url = self.detectURL(in: text) {
                            completion((url, text))
                        } else {
                            completion(nil)
                        }
                    }
                    return
                }
            }
        }

        if !found { completion(nil) }
    }

    private func detectURL(in text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        return detector?
            .matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
            .first
            .flatMap { $0.url?.absoluteString }
    }

    // MARK: - App opening

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

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
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
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
