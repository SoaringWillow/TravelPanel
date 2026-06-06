import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL, text, or image from the iOS Share Sheet and opens
// the main TravelPanel app via travelpanel://share?url=...&title=...
//
// Image flow (Xiaohongshu / WeChat screenshots):
//   1. Compress image to JPEG ≤400KB, encode base64
//   2. Write base64 to App Group UserDefaults as "pendingShareImage"
//   3. Open app with hasImage=1 flag in URL scheme
//   4. CapacitorBridge reads image back via @capacitor/preferences (App Group)
//   5. /api/import receives base64 image, Claude Vision extracts content

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
            let title = item.attributedContentText?.string ?? ""

            // Priority 1: URL (may co-exist with an image attachment from the app)
            if let urlAttachment = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
                urlAttachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                    guard let self, let url = data as? URL else { self?.finish(); return }

                    // Try to capture an accompanying image (e.g. Xiaohongshu OG preview)
                    if let imgAttachment = item.attachments?.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) {
                        imgAttachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] imgData, _ in
                            guard let self else { return }
                            let image = self.imageFrom(imgData)
                            self.openApp(url: url.absoluteString, title: title, image: image)
                        }
                    } else {
                        self.openApp(url: url.absoluteString, title: title, image: nil)
                    }
                }
                return
            }

            // Priority 2: Plain text that may contain a URL
            if let textAttachment = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
                textAttachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let text = data as? String, let urlStr = self.extractURL(from: text) {
                        self.openApp(url: urlStr, title: text, image: nil)
                    } else {
                        self.finish()
                    }
                }
                return
            }

            // Priority 3: Image only (screenshot share — the Xiaohongshu fix)
            if let imgAttachment = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) {
                imgAttachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    guard let self else { return }
                    if let image = self.imageFrom(data) {
                        self.openApp(url: nil, title: title, image: image)
                    } else {
                        self.finish()
                    }
                }
                return
            }
        }

        finish()
    }

    // MARK: - Open app

    private func openApp(url: String?, title: String, image: UIImage?) {
        if let image = image {
            saveImageToAppGroup(image)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"

        var queryItems: [URLQueryItem] = []
        if let url = url { queryItems.append(URLQueryItem(name: "url", value: url)) }
        if !title.isEmpty { queryItems.append(URLQueryItem(name: "title", value: title)) }
        if image != nil  { queryItems.append(URLQueryItem(name: "hasImage", value: "1")) }
        components.queryItems = queryItems

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group for pickup on next app launch
        if let url = url {
            savePendingShareToAppGroup(url: url, title: title)
        }
        finish()
    }

    // MARK: - Helpers

    private func imageFrom(_ data: Any?) -> UIImage? {
        if let img = data as? UIImage { return img }
        if let url = data as? URL    { return UIImage(contentsOfFile: url.path) }
        if let raw = data as? Data   { return UIImage(data: raw) }
        return nil
    }

    /// Write compressed JPEG (≤400 KB) as base64 to App Group UserDefaults.
    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        var quality: CGFloat = 0.72
        var jpeg = image.jpegData(compressionQuality: quality)
        while let d = jpeg, d.count > 400_000, quality > 0.1 {
            quality = max(quality - 0.15, 0.1)
            jpeg = image.jpegData(compressionQuality: quality)
        }
        if let d = jpeg {
            defaults.set(d.base64EncodedString(), forKey: "pendingShareImage")
            defaults.synchronize()
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
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
