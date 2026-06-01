import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL, optional title, and optional screenshot from the iOS Share Sheet.
// Opens the main TravelPanel app via the travelpanel:// URL scheme so the web layer
// can call Claude (URL scraping or Vision) to extract spots + substance.
//
// Image capture path (Xiaohongshu / WeChat anti-scraping fix):
//   1. Capture the first image attachment and resize to max 1024px JPEG (≈100–300KB)
//   2. Base64-encode it and save to App Group UserDefaults as "pendingShareImage"
//   3. Pass hasImage=1 in the URL scheme so CapacitorBridge reads it from Preferences

class ShareViewController: UIViewController {

    // Maximum dimension for the compressed screenshot sent to Claude Vision
    private let maxImageDimension: CGFloat = 1024
    // JPEG quality 0–1. Lower = smaller payload, faster Vision call.
    private let imageJpegQuality: CGFloat = 0.65

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

            for attachment in attachments {
                // URL attachment
                if foundURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                            if foundTitle == nil {
                                foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                            }
                        }
                    }
                }

                // Image attachment (screenshot / photo)
                if foundImage == nil && attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let url = data as? URL,
                                  let imageData = try? Data(contentsOf: url),
                                  let image = UIImage(data: imageData) {
                            foundImage = image
                        }
                    }
                }

                // Plain text (may contain a URL)
                if foundURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String {
                            if let extracted = self.extractURL(from: text) {
                                foundURL = extracted
                            }
                            if foundTitle == nil { foundTitle = text }
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            let url = foundURL ?? ""
            let title = foundTitle ?? ""
            self.openApp(url: url, title: title, image: foundImage)
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // Resize image so the longest edge ≤ maxImageDimension and encode as JPEG base64
    private func prepareImage(_ image: UIImage) -> String? {
        let size = image.size
        let maxDim = max(size.width, size.height)
        guard maxDim > 0 else { return nil }

        let scale = maxDim > maxImageDimension ? maxImageDimension / maxDim : 1.0
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: targetSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let jpegData = resized?.jpegData(compressionQuality: imageJpegQuality) else { return nil }
        return jpegData.base64EncodedString()
    }

    private func openApp(url: String, title: String, image: UIImage?) {
        // If we have an image, save it to App Group before opening the app
        let hasImage = image != nil
        if let image, let base64 = prepareImage(image) {
            saveImageToAppGroup(base64)
        }

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

        // Open the main app with the deep link
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

        // Fallback: write everything to App Group for next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func saveImageToAppGroup(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
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
