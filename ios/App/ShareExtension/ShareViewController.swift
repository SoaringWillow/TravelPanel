import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional preview image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For scraping-blocked platforms (Xiaohongshu, WeChat) the extension also captures
// any image attachment, resizes it to ≤768px, and writes it to the App Group
// container as "share_image.jpg". The web layer reads this via the
// TravelPanelShareImage Capacitor plugin (see ios/App/App/Plugins/).
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    private let appGroupId = "group.com.travelpanel.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var urlString: String?
        var title: String?
        var imageData: Data?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Capture title from the item's attributed content text
            if title == nil {
                title = item.attributedContentText?.string
            }

            for attachment in attachments {
                // URL attachment
                if urlString == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            urlString = url.absoluteString
                        }
                        group.leave()
                    }
                }

                // Plain text (may contain URL)
                if urlString == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        if let text = data as? String {
                            urlString = urlString ?? self?.extractURL(from: text)
                            if title == nil { title = text }
                        }
                        group.leave()
                    }
                }

                // Image attachment (screenshot or post thumbnail)
                if imageData == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let image = data as? UIImage {
                            uiImage = image
                        } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                            uiImage = image
                        } else if let imgData = data as? Data, let image = UIImage(data: imgData) {
                            uiImage = image
                        }
                        if let image = uiImage {
                            imageData = self.resizeAndEncode(image)
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = urlString else {
                self.finish()
                return
            }

            // Write image to App Group container if captured
            var hasImage = false
            if let data = imageData {
                hasImage = self.saveImageToAppGroup(data)
            }

            self.openApp(url: url, title: title ?? "", hasImage: hasImage)
        }
    }

    // MARK: — Image helpers

    private func resizeAndEncode(_ image: UIImage) -> Data? {
        let maxDimension: CGFloat = 768
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.75)
    }

    private func saveImageToAppGroup(_ data: Data) -> Bool {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return false
        }
        let fileURL = containerURL.appendingPathComponent("share_image.jpg")
        do {
            try data.write(to: fileURL, options: .atomic)
            return true
        } catch {
            return false
        }
    }

    // MARK: — URL extraction

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: — App launch

    private func openApp(url: String, title: String, hasImage: Bool) {
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

        // Fallback: write to App Group UserDefaults and let the main app pick up on next launch
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        defaults.set(url,      forKey: "pendingShareURL")
        defaults.set(title,    forKey: "pendingShareTitle")
        defaults.set(hasImage, forKey: "pendingShareHasImage")
        defaults.set(Date(),   forKey: "pendingShareDate")
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
