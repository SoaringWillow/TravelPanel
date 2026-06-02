import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// When an image is also shared (e.g. a Xiaohongshu screenshot where URL scraping is
// blocked), the image is JPEG-compressed, base64-encoded, and written to App Group
// shared storage. CapacitorBridge reads it on app resume, stores it in sessionStorage,
// and the /share page forwards it to /api/import so Claude Vision can extract content.
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
            let title = item.attributedContentText?.string

            for attachment in attachments {
                // Priority 1: direct URL attachment
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL, foundURL == nil {
                            foundURL = url.absoluteString
                            foundTitle = title ?? url.host ?? ""
                        }
                    }
                }
                // Priority 2: plain text (may contain URL)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String, foundURL == nil,
                           let extracted = self.extractURL(from: text) {
                            foundURL = extracted
                            foundTitle = title ?? text
                        }
                    }
                }
                // Priority 3: image (Xiaohongshu / WeChat share screenshot)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if foundImage != nil { return }
                        if let img = data as? UIImage {
                            foundImage = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            foundImage = img
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "", image: foundImage)
            } else if let image = foundImage {
                // Image-only share (no URL) — still worth saving via vision
                self.openApp(url: "", title: foundTitle ?? "Shared image", image: image)
            } else {
                self.finish()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, image: UIImage?) {
        // Write image to App Group so the main app can retrieve it after launch.
        // The image is resized to ≤800px and JPEG-compressed to keep the payload small.
        var imageKey: String? = nil
        if let img = image, let jpeg = resizedJpeg(img, maxDimension: 800, quality: 0.72) {
            let b64 = "data:image/jpeg;base64," + jpeg.base64EncodedString()
            if let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") {
                let key = "pendingShareImage_\(Int(Date().timeIntervalSince1970))"
                defaults.set(b64, forKey: key)
                defaults.synchronize()
                imageKey = key
            }
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]
        if let key = imageKey {
            queryItems.append(URLQueryItem(name: "imageKey", value: key))
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

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title, imageKey: imageKey)
        finish()
    }

    private func resizedJpeg(_ image: UIImage, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        let size = image.size
        let scale: CGFloat
        if size.width > size.height {
            scale = size.width > maxDimension ? maxDimension / size.width : 1.0
        } else {
            scale = size.height > maxDimension ? maxDimension / size.height : 1.0
        }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: quality)
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageKey: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let key = imageKey {
            defaults.set(key, forKey: "pendingShareImageKey")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
