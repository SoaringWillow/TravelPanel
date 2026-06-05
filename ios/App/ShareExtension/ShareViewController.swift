import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL and/or image (screenshot) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=...&hasImage=1
// URL scheme, which the CapacitorBridge component routes to /share.
//
// Image handling (Xiaohongshu / WeChat fix):
//   When an image is shared (screenshot of a post), it is compressed to JPEG
//   and stored in the App Group UserDefaults under "pendingShareImage".
//   CapacitorBridge reads this key on next app focus and passes it to the
//   /api/import endpoint for Claude Vision extraction.
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

            // Collect URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                        group.leave()
                    }
                }
            }

            // Collect image (screenshot of post)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) && foundImage == nil {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                            foundImage = image
                        } else if let rawData = data as? Data, let image = UIImage(data: rawData) {
                            foundImage = image
                        }
                        group.leave()
                    }
                }
            }

            // Fallback: plain text that may contain a URL
            if foundURL == nil {
                for attachment in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                        group.enter()
                        attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                            if let text = data as? String, let url = self.extractURL(from: text) {
                                foundURL = url
                                if foundTitle == nil { foundTitle = text }
                            }
                            group.leave()
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Save image to App Group if present
            let hasImage = foundImage != nil
            if let image = foundImage {
                self.compressAndSaveImage(image)
            }

            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "", hasImage: hasImage)
            } else if hasImage {
                // Image-only share: open with a placeholder URL so the share page loads
                self.openApp(url: "travelpanel://screenshot", title: foundTitle ?? "Screenshot", hasImage: true)
            } else {
                self.finish()
            }
        }
    }

    // MARK: – Image compression

    private func compressAndSaveImage(_ image: UIImage) {
        let maxDimension: CGFloat = 900
        let size = image.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        let targetSize = CGSize(width: floor(size.width * scale), height: floor(size.height * scale))

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.55) else { return }

        // Only store if within UserDefaults safe limit (~900 KB)
        guard jpegData.count < 900_000 else { return }

        let base64 = jpegData.base64EncodedString()

        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
    }

    // MARK: – URL extraction

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // MARK: – App opener

    private func openApp(url: String, title: String, hasImage: Bool) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
            URLQueryItem(name: "hasImage", value: hasImage ? "1" : "0"),
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
