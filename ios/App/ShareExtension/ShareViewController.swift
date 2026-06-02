import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL and/or image from the iOS Share Sheet and opens
// the main TravelPanel app via the travelpanel:// URL scheme.
//
// When an image is present (e.g. Xiaohongshu screenshot), it is saved
// to App Group UserDefaults as a compressed JPEG base64 string so the
// main app can pass it to Claude Vision for extraction.
//
// Deep link fired: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=1]
// Supported source types: URLs, plain text containing a URL, images, web pages.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    // ── Main extraction ─────────────────────────────────────────────────────

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

                // Plain text (may embed a URL)
                if foundURL == nil && attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String {
                            if let url = self.extractURL(from: text) {
                                foundURL = url
                            }
                            if foundTitle == nil { foundTitle = text }
                        }
                    }
                }

                // Image attachment (screenshot share — primary for Xiaohongshu/WeChat)
                if foundImage == nil {
                    let imageTypes = [UTType.jpeg.identifier, UTType.png.identifier,
                                      UTType.image.identifier, "public.image"]
                    for imageType in imageTypes {
                        if attachment.hasItemConformingToTypeIdentifier(imageType) {
                            group.enter()
                            attachment.loadItem(forTypeIdentifier: imageType) { data, _ in
                                defer { group.leave() }
                                if let image = data as? UIImage {
                                    foundImage = image
                                } else if let url = data as? URL,
                                          let image = UIImage(contentsOfFile: url.path) {
                                    foundImage = image
                                }
                            }
                            break
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            self.openApp(
                url: foundURL ?? "",
                title: foundTitle ?? "",
                image: foundImage
            )
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    /// Resize image to fit within maxDimension, preserving aspect ratio.
    private func resizedImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        if scale >= 1.0 { return image }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    // ── Open app ─────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, image: UIImage?) {
        // Save image to App Group so CapacitorBridge can read it for Claude Vision
        let hasImage = saveImageToAppGroup(image)

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
            savePendingShareToAppGroup(url: url, title: title)
            finish()
            return
        }

        // Open the main app via responder chain (iOS 13+)
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

    // ── App Group storage ────────────────────────────────────────────────────

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    /// Compresses image to JPEG, base64-encodes it, and stores in App Group.
    /// Returns true if an image was saved successfully.
    @discardableResult
    private func saveImageToAppGroup(_ image: UIImage?) -> Bool {
        guard let image,
              let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return false }

        // Resize to max 960px (keeps base64 under ~150KB)
        let resized = resizedImage(image, maxDimension: 960)
        guard let jpegData = resized.jpegData(compressionQuality: 0.65) else { return false }

        let base64 = jpegData.base64EncodedString()
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.synchronize()
        return true
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
