import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// For Xiaohongshu / WeChat posts that block server-side scraping, the extension
// also captures any attached image and writes it to the shared App Group container
// so the main app can send it to /api/import for Claude Vision extraction.
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

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 0: capture any image attachment and save to App Group.
            // This runs in parallel with URL extraction — we don't wait for it
            // before opening the app, but the image will be ready by the time
            // the main app calls enrichItem.
            for attachment in attachments {
                let imageTypes = [UTType.image.identifier, UTType.jpeg.identifier,
                                  UTType.png.identifier, "public.heic"]
                for imageType in imageTypes {
                    if attachment.hasItemConformingToTypeIdentifier(imageType) {
                        attachment.loadItem(forTypeIdentifier: imageType) { [weak self] data, _ in
                            guard let self else { return }
                            var image: UIImage?
                            if let img = data as? UIImage {
                                image = img
                            } else if let url = data as? URL, let imgData = try? Data(contentsOf: url) {
                                image = UIImage(data: imgData)
                            } else if let imgData = data as? Data {
                                image = UIImage(data: imgData)
                            }
                            if let img = image {
                                self.saveImageToAppGroup(img)
                            }
                        }
                        break
                    }
                }
            }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.openApp(url: url.absoluteString, title: title, hasImage: true)
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
                            self.openApp(url: url, title: text, hasImage: true)
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

    // Save a UIImage to the App Group shared container as a JPEG.
    // The main app reads this via the pendingShareImageKey + pendingShareImageDate keys.
    // Image is resized to max 1024px on the long edge to keep the base64 payload manageable.
    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        let maxDim: CGFloat = 1024
        let resized = resizeImage(image, maxDimension: maxDim)
        guard let jpegData = resized.jpegData(compressionQuality: 0.82) else { return }

        let base64 = jpegData.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImageBase64")
        defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        defaults.set(Date(), forKey: "pendingShareImageDate")
        defaults.synchronize()
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longEdge = max(size.width, size.height)
        guard longEdge > maxDimension else { return image }
        let scale = maxDimension / longEdge
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let result = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return result
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool = false) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        var queryItems = [
            URLQueryItem(name: "url", value: url),
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
