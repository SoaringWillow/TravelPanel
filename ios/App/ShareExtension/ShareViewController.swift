import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL + optional screenshot from the iOS Share Sheet and opens the
// main TravelPanel app. Images are compressed and stored in the App Group so
// the web layer can pass them to Claude Vision (critical for Xiaohongshu, which
// blocks URL-based scraping).
//
// Flow:
//   1. Collect all attachments concurrently via DispatchGroup (URL + image + text)
//   2. Compress any image to JPEG ≤800px and write base64 to App Group
//   3. Open app via travelpanel:// deep link with url + title params
//   4. Fallback: write URL/title to App Group if URL scheme not available

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        extractAndShare()
    }

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        var foundURL: String?
        var foundTitle: String?
        var foundImage: UIImage?
        let group = DispatchGroup()

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
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

                } else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let image = data as? UIImage {
                            foundImage = image
                        } else if let fileURL = data as? URL,
                                  let image = UIImage(contentsOfFile: fileURL.path) {
                            foundImage = image
                        } else if let bytes = data as? Data,
                                  let image = UIImage(data: bytes) {
                            foundImage = image
                        }
                    }

                } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        guard let self else { return }
                        if let text = data as? String,
                           foundURL == nil,
                           let extracted = self.extractURL(from: text) {
                            foundURL = extracted
                            if foundTitle == nil { foundTitle = text }
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            if let image = foundImage { self.storeImageInAppGroup(image) }
            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "")
            } else {
                self.finish()
            }
        }
    }

    // Resize to max 800px, compress to JPEG 50%, store base64 in App Group.
    private func storeImageInAppGroup(_ image: UIImage) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        let resized = resizeImage(image, maxDimension: 800)
        guard let jpeg = resized.jpegData(compressionQuality: 0.5) else { return }
        defaults.set(jpeg.base64EncodedString(), forKey: "pendingShareImage")
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let largest = max(size.width, size.height)
        guard largest > maxDimension else { return image }
        let scale = maxDimension / largest
        let newSize = CGSize(
            width: (size.width * scale).rounded(),
            height: (size.height * scale).rounded()
        )
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

    private func openApp(url: String, title: String) {
        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else {
            finish(); return
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
