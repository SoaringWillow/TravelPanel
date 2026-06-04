import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional post screenshot/thumbnail) from the iOS Share Sheet
// and opens the main TravelPanel app with the travelpanel://share?url=...&title=...
// URL scheme, which the CapacitorBridge component routes to /share.
//
// When an image is available (e.g. Xiaohongshu thumbnail that blocks web scraping),
// it is compressed and saved to the App Group UserDefaults so AppDelegate can inject
// it into the URL before handing off to the Capacitor web layer.

class ShareViewController: UIViewController {

    // App Group suite name — must match Xcode Capabilities setting
    private let appGroupSuite = "group.com.travelpanel.app"

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

            // URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            foundURL = url.absoluteString
                            foundTitle = item.attributedContentText?.string ?? url.host ?? ""
                        }
                    }
                    break
                }
            }

            // Plain text fallback — may contain a URL
            if foundURL == nil {
                for attachment in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                        group.enter()
                        attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                            defer { group.leave() }
                            if let text = data as? String, let url = self.extractURL(from: text) {
                                foundURL = url
                                foundTitle = text
                            }
                        }
                        break
                    }
                }
            }

            // Image attachment — captures post screenshots / thumbnails
            // Used by Claude Vision when the URL's page content is blocked (e.g. Xiaohongshu)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let uiImage = data as? UIImage {
                            foundImage = uiImage
                        } else if let imageData = data as? Data {
                            foundImage = UIImage(data: imageData)
                        } else if let imageURL = data as? URL,
                                  let imageData = try? Data(contentsOf: imageURL) {
                            foundImage = UIImage(data: imageData)
                        }
                    }
                    break
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }

            // Save compressed image to App Group so AppDelegate can inject it into the URL
            if let image = foundImage {
                self.saveImageToAppGroup(image)
            }

            if let url = foundURL {
                self.openApp(url: url, title: foundTitle ?? "")
            } else {
                self.finish()
            }
        }
    }

    // Compress image to max 400×400 JPEG at 40% quality and store as base64 in App Group.
    // At 400×400 this produces ~15–25 KB base64, safely within URL scheme limits.
    private func saveImageToAppGroup(_ image: UIImage) {
        let maxDim: CGFloat = 400
        let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }

        guard let jpegData = resized.jpegData(compressionQuality: 0.4) else { return }
        let base64 = jpegData.base64EncodedString()

        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(base64, forKey: "pendingShareImage")
        defaults.synchronize()
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
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
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
