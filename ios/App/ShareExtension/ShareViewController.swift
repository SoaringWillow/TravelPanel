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
// B3 addition: also captures image attachments (Xiaohongshu and similar
// platforms include a preview image in the share payload). The image is
// compressed and written to the App Group so the main app can send it
// to Claude Vision for richer extraction when HTML scraping is blocked.
//
// Supported source types: URLs, plain text containing a URL, web pages,
// images (PNG / JPEG / HEIC).

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
                            self.extractImageThenOpenApp(url: url.absoluteString, title: title, attachments: attachments)
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
                            self.extractImageThenOpenApp(url: url, title: text, attachments: attachments)
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

    // After finding the URL, scan for any image attachment in the same item.
    // If found, compress + save to App Group, then open the app with hasImage=1.
    private func extractImageThenOpenApp(url: String, title: String, attachments: [NSItemProvider]) {
        let imageTypeIdentifiers = [
            UTType.image.identifier,
            UTType.png.identifier,
            UTType.jpeg.identifier,
            "public.heic",
        ]

        for attachment in attachments {
            for typeId in imageTypeIdentifiers {
                if attachment.hasItemConformingToTypeIdentifier(typeId) {
                    attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                        guard let self else { return }
                        var uiImage: UIImage?
                        if let imgData = data as? Data {
                            uiImage = UIImage(data: imgData)
                        } else if let imgURL = data as? URL {
                            uiImage = UIImage(contentsOfFile: imgURL.path)
                        } else if let img = data as? UIImage {
                            uiImage = img
                        }

                        let saved = uiImage.map { self.saveImageToAppGroup($0) } ?? false
                        DispatchQueue.main.async {
                            self.openApp(url: url, title: title, hasImage: saved)
                        }
                    }
                    return // only process the first image found
                }
            }
        }

        // No image attachment found — proceed without one
        openApp(url: url, title: title, hasImage: false)
    }

    // Resize + compress the image and store it as base64 in the shared App Group.
    // Returns true when the write succeeded.
    @discardableResult
    private func saveImageToAppGroup(_ image: UIImage) -> Bool {
        // Scale down to 1024px max — keeps base64 string under ~300 KB
        let maxDim: CGFloat = 1024
        let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
        let newSize = CGSize(
            width:  (image.size.width  * scale).rounded(),
            height: (image.size.height * scale).rounded()
        )

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        guard let jpegData = resized.jpegData(compressionQuality: 0.72) else { return false }
        let base64 = jpegData.base64EncodedString()

        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
        return true
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components       = URLComponents()
        components.scheme    = "travelpanel"
        components.host      = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if hasImage {
            components.queryItems?.append(URLQueryItem(name: "hasImage", value: "1"))
        }

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
        savePendingShareToAppGroup(url: url, title: title)
        finish()
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
