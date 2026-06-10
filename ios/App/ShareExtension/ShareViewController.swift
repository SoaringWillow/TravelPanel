import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + image thumbnail) from the iOS Share Sheet
// and opens the main TravelPanel app with:
//   travelpanel://share?url=...&title=...&hasImage=1
//
// When an image is present alongside the URL, it is compressed to ≤512 px JPEG
// and written to the App Group UserDefaults as `pendingShareImageBase64`.
// CapacitorBridge reads this on the next appUrlOpen event and passes it to the
// /api/import vision path so Claude Vision can extract content from platforms
// like Xiaohongshu/WeChat that block server-side scraping.

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
                            // Also scan for an image in this item to pass alongside the URL
                            self.extractImageIfPresent(from: attachments) { _ in
                                self.openApp(url: url.absoluteString, title: title)
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
                            self.extractImageIfPresent(from: attachments) { _ in
                                self.openApp(url: url, title: text)
                            }
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

    // Scans attachments for the first JPEG/PNG image, compresses it,
    // saves base64 to App Group, and calls the completion handler.
    private func extractImageIfPresent(
        from attachments: [NSItemProvider],
        completion: @escaping (Bool) -> Void
    ) {
        let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier, UTType.image.identifier]

        for attachment in attachments {
            for typeId in imageTypes {
                if attachment.hasItemConformingToTypeIdentifier(typeId) {
                    attachment.loadItem(forTypeIdentifier: typeId) { [weak self] data, _ in
                        var image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else if let imgData = data as? Data {
                            image = UIImage(data: imgData)
                        }

                        if let image = image, let base64 = self?.compressAndEncode(image) {
                            self?.saveImageToAppGroup(base64: base64)
                            completion(true)
                        } else {
                            completion(false)
                        }
                    }
                    return
                }
            }
        }

        completion(false)
    }

    // Resize to ≤512 px on the long edge and JPEG-compress at 0.75 quality.
    // Produces ~30–100 KB JPEG which fits comfortably in UserDefaults (~40–135 KB base64).
    private func compressAndEncode(_ image: UIImage) -> String? {
        let maxDim: CGFloat = 512
        let size = image.size
        let scale = min(maxDim / size.width, maxDim / size.height, 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpegData = resized?.jpegData(compressionQuality: 0.75) else { return nil }
        return jpegData.base64EncodedString()
    }

    private func saveImageToAppGroup(base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.synchronize()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        let hasImage = UserDefaults(suiteName: "group.com.travelpanel.app")?.string(forKey: "pendingShareImageBase64") != nil

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
