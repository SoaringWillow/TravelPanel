import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers
import ImageIO

// TravelPanel Share Extension
//
// Receives a URL, text, and optional image from the iOS Share Sheet and opens
// the main TravelPanel app via the travelpanel:// URL scheme.
//
// For Xiaohongshu/WeChat (which block server-side scraping), we also capture
// any image attachment and write it to App Group so the web app can send it to
// Claude Vision for extraction.
//
// Data flow:
//   URL scheme path:  travelpanel://share?url=...&title=...&text=...
//   App Group path:   pendingShareURL / pendingShareTitle / pendingShareText / pendingShareImage

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
        var foundText: String?
        var foundImageData: Data?

        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Capture the human-readable text content of the shared item
            if let attributed = item.attributedContentText?.string, !attributed.isEmpty {
                foundText = attributed
            }

            for attachment in attachments {
                // Priority 1: direct URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                        }
                        group.leave()
                    }
                }

                // Priority 2: plain text (may contain URL + post caption)
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { group.leave(); return }
                        if let text = data as? String {
                            if foundText == nil || text.count > (foundText?.count ?? 0) {
                                foundText = text
                            }
                            if foundURL == nil, let extracted = self.extractURL(from: text) {
                                foundURL = extracted
                            }
                        }
                        group.leave()
                    }
                }

                // Capture image (thumbnail/screenshot) for Vision extraction
                let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier,
                                  UTType.image.identifier, "public.image"]
                for imageType in imageTypes {
                    if foundImageData == nil && attachment.hasItemConformingToTypeIdentifier(imageType) {
                        group.enter()
                        attachment.loadItem(forTypeIdentifier: imageType) { data, _ in
                            if foundImageData == nil {
                                if let imgData = data as? Data {
                                    foundImageData = imgData
                                } else if let url = data as? URL,
                                          let imgData = try? Data(contentsOf: url) {
                                    foundImageData = imgData
                                } else if let img = data as? UIImage,
                                          let imgData = img.jpegData(compressionQuality: 0.7) {
                                    foundImageData = imgData
                                }
                            }
                            group.leave()
                        }
                        break
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard let url = foundURL else {
                self.finish()
                return
            }

            // Compress + base64-encode the image if present (target ≤ 500 KB base64)
            var imageBase64: String?
            if let imgData = foundImageData {
                imageBase64 = self.compressAndEncode(imgData, maxBytes: 375_000)
            }

            self.openApp(url: url, title: foundText?.components(separatedBy: "\n").first ?? "",
                         text: foundText, imageBase64: imageBase64)
        }
    }

    // Compress image to stay within a base64 size budget
    private func compressAndEncode(_ data: Data, maxBytes: Int) -> String? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            // Not an image we can process
            return data.count <= maxBytes ? data.base64EncodedString() : nil
        }

        let originalWidth  = cgImage.width
        let originalHeight = cgImage.height
        let maxDimension   = 768

        // Scale down if needed
        let scale: CGFloat
        if originalWidth > maxDimension || originalHeight > maxDimension {
            scale = CGFloat(maxDimension) / CGFloat(max(originalWidth, originalHeight))
        } else {
            scale = 1.0
        }

        let targetWidth  = Int(CGFloat(originalWidth) * scale)
        let targetHeight = Int(CGFloat(originalHeight) * scale)

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: targetWidth, height: targetHeight))
        let resized  = renderer.image { _ in
            UIImage(cgImage: cgImage).draw(in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
        }

        // Try progressively lower quality until we fit the budget
        for quality in stride(from: 0.75, through: 0.3, by: -0.15) {
            if let jpeg = resized.jpegData(compressionQuality: quality), jpeg.count <= maxBytes {
                return jpeg.base64EncodedString()
            }
        }
        return nil
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, text: String?, imageBase64: String?) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host   = "share"
        var queryItems    = [URLQueryItem(name: "url",   value: url),
                             URLQueryItem(name: "title", value: title)]
        if let t = text, !t.isEmpty {
            // Trim to 2000 chars — URL scheme has limits; full text goes to App Group
            queryItems.append(URLQueryItem(name: "text", value: String(t.prefix(2000))))
        }
        components.queryItems = queryItems

        // Write full payload to App Group for fallback (and for large image)
        saveToAppGroup(url: url, title: title, text: text, imageBase64: imageBase64)

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

        // URL scheme open failed; App Group fallback already written above
        finish()
    }

    private func saveToAppGroup(url: String, title: String, text: String?, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let t = text { defaults.set(t, forKey: "pendingShareText") }
        else { defaults.removeObject(forKey: "pendingShareText") }
        if let img = imageBase64 { defaults.set(img, forKey: "pendingShareImage") }
        else { defaults.removeObject(forKey: "pendingShareImage") }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
