import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + preview image) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// For platforms like Xiaohongshu that block server-side page fetching, the extension
// also captures the share preview image and stores it in App Group storage.
// CapacitorBridge reads it from Preferences and passes it to the enrichment API
// for Claude Vision extraction.
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

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            // Look for a preview image in the same item's attachments
                            self.capturePreviewImage(from: attachments) { imageBase64 in
                                self.openApp(url: url.absoluteString, title: title, imageBase64: imageBase64)
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
                            self.capturePreviewImage(from: attachments) { imageBase64 in
                                self.openApp(url: url, title: text, imageBase64: imageBase64)
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

    // Looks for a public.image or public.jpeg attachment and returns it as a
    // base64-encoded JPEG string, scaled to max 512 × 512 px at 60% quality.
    private func capturePreviewImage(from attachments: [NSItemProvider], completion: @escaping (String?) -> Void) {
        let imageTypes = [UTType.image.identifier, UTType.jpeg.identifier, UTType.png.identifier, "com.apple.uikit.image"]
        for attachment in attachments {
            for type in imageTypes where attachment.hasItemConformingToTypeIdentifier(type) {
                attachment.loadItem(forTypeIdentifier: type) { data, _ in
                    var image: UIImage?
                    if let img = data as? UIImage {
                        image = img
                    } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                        image = img
                    } else if let imgData = data as? Data {
                        image = UIImage(data: imgData)
                    }

                    guard let raw = image else {
                        completion(nil)
                        return
                    }

                    let thumbnail = raw.resized(toFit: CGSize(width: 512, height: 512))
                    guard let jpeg = thumbnail.jpegData(compressionQuality: 0.6) else {
                        completion(nil)
                        return
                    }
                    completion(jpeg.base64EncodedString())
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

    private func openApp(url: String, title: String, imageBase64: String?) {
        // Write image to App Group before opening the URL scheme —
        // CapacitorBridge reads it immediately after handling the appUrlOpen event.
        if let imageBase64 {
            savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
        }

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            // If URL scheme build fails, ensure App Group has everything for fallback path
            savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
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

        // Fallback: write full payload to App Group for CapacitorBridge to pick up on next launch
        savePendingShareToAppGroup(url: url, title: title, imageBase64: imageBase64)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let imageBase64 {
            defaults.set(imageBase64, forKey: "pendingShareImageBase64")
        } else {
            defaults.removeObject(forKey: "pendingShareImageBase64")
        }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}

// MARK: - UIImage resize helper

private extension UIImage {
    func resized(toFit maxSize: CGSize) -> UIImage {
        let scale = min(maxSize.width / size.width, maxSize.height / size.height, 1)
        if scale >= 1 { return self }
        let newSize = CGSize(width: floor(size.width * scale), height: floor(size.height * scale))
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
