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
// Also captures the first image attachment (screenshot/thumbnail) and saves
// it compressed to App Group storage so the web layer can pass it to Claude
// Vision — bypassing anti-scraping on Xiaohongshu, WeChat, etc.
//
// Supported source types: URLs, plain text containing a URL, images with
// embedded URL metadata.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // MARK: - Main extraction flow

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        extractURL(from: items) { [weak self] urlString, title in
            guard let self, let urlString else { self?.finish(); return }

            // Concurrently capture any image attachment for Vision-based extraction
            self.extractImage(from: items) { [weak self] image in
                guard let self else { return }
                if let img = image {
                    self.saveImageToAppGroup(img)
                }
                DispatchQueue.main.async {
                    self.openApp(url: urlString, title: title, hasImage: image != nil)
                }
            }
        }
    }

    // MARK: - URL extraction

    private func extractURL(from items: [NSExtensionItem], completion: @escaping (String?, String) -> Void) {
        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            completion(url.absoluteString, title)
                        } else {
                            completion(nil, "")
                        }
                    }
                    return
                }
            }

            // Priority 2: plain text that may contain a URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        if let text = data as? String, let url = self?.extractURLString(from: text) {
                            completion(url, text)
                        } else {
                            completion(nil, "")
                        }
                    }
                    return
                }
            }
        }
        completion(nil, "")
    }

    // MARK: - Image extraction

    private func extractImage(from items: [NSExtensionItem], completion: @escaping (UIImage?) -> Void) {
        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        var image: UIImage?
                        if let fileURL = data as? URL {
                            image = UIImage(contentsOfFile: fileURL.path)
                        } else if let img = data as? UIImage {
                            image = img
                        }
                        completion(image)
                    }
                    return
                }
            }
        }
        completion(nil)
    }

    // MARK: - App Group storage

    // Saves a compressed JPEG to App Group UserDefaults so the web layer can
    // retrieve it via @capacitor/preferences and pass it to Claude Vision.
    private func saveImageToAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }

        // Resize to max 800px on the longer edge to keep base64 under ~300KB
        let maxDimension: CGFloat = 800
        let scale = min(maxDimension / image.size.width, maxDimension / image.size.height, 1.0)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpeg = resized?.jpegData(compressionQuality: 0.65) else { return }
        let base64 = jpeg.base64EncodedString()

        defaults.set(base64, forKey: "pendingShareImage")
        defaults.set("image/jpeg", forKey: "pendingShareImageType")
        defaults.synchronize()
    }

    // MARK: - Deep link

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
        savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool = false) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ios/App/ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if hasImage { defaults.set("true", forKey: "pendingShareHasImage") }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // MARK: - Helpers

    private func extractURLString(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
