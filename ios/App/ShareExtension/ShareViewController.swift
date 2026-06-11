import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional screenshot image) from the iOS Share Sheet and opens
// the main TravelPanel app with the travelpanel://share?url=...&title=... URL scheme,
// which the CapacitorBridge component routes to /share.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.
//
// Image capture (B3 — Xiaohongshu fix):
//   When the share payload contains an image (screenshot), it is compressed to JPEG
//   and written to the App Group shared container as pendingShareImage.jpg.
//   The URL scheme carries hasImage=1 so the web layer knows to show the "screenshot
//   detected" UI and read the file.
//
//   TODO (future): A custom Capacitor plugin (TravelPanelPlugin) is needed so the
//   JavaScript layer can read pendingShareImage.jpg from the App Group container.
//   Until that plugin is built, users can paste/upload the screenshot manually in
//   the /share page — the /api/import vision path is already wired.

class ShareViewController: UIViewController {

    private let appGroupID = "group.com.travelpanel.app"
    private let imageFilename = "pendingShareImage.jpg"

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
                            // Also check for an image in the same item
                            self.extractImage(from: attachments) { hasImage in
                                self.openApp(url: url.absoluteString, title: title, hasImage: hasImage)
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
                            self.extractImage(from: attachments) { hasImage in
                                self.openApp(url: url, title: text, hasImage: hasImage)
                            }
                        } else {
                            self.finish()
                        }
                    }
                    return
                }
            }

            // Priority 3: image-only share (screenshot without a URL, e.g. Xiaohongshu in-app share)
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image = (data as? UIImage) ?? ((data as? URL).flatMap { UIImage(contentsOfFile: $0.path) })
                        if let image = image {
                            self.saveImageToAppGroup(image)
                            self.openApp(url: "", title: item.attributedContentText?.string ?? "Screenshot", hasImage: true)
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

    // Extract an image attachment from the list (non-blocking, calls completion on main queue)
    private func extractImage(from attachments: [NSItemProvider], completion: @escaping (Bool) -> Void) {
        guard let imageProvider = attachments.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
        }) else {
            completion(false)
            return
        }

        imageProvider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
            guard let self else { completion(false); return }
            let image = (data as? UIImage) ?? ((data as? URL).flatMap { UIImage(contentsOfFile: $0.path) })
            if let image = image {
                self.saveImageToAppGroup(image)
                completion(true)
            } else {
                completion(false)
            }
        }
    }

    // Compress image and write to App Group shared container
    private func saveImageToAppGroup(_ image: UIImage) {
        guard
            let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroupID
            ),
            let jpegData = image.jpegData(compressionQuality: 0.6)
        else { return }

        let fileURL = containerURL.appendingPathComponent(imageFilename)
        try? jpegData.write(to: fileURL, options: .atomic)

        // Flag in UserDefaults so the main app knows an image is waiting
        UserDefaults(suiteName: appGroupID)?.set(true, forKey: "pendingShareHasImage")
        UserDefaults(suiteName: appGroupID)?.synchronize()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String, hasImage: Bool) {
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
            savePendingShareToAppGroup(url: url, title: title, hasImage: hasImage)
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

    private func savePendingShareToAppGroup(url: String, title: String, hasImage: Bool) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See ShareExtension/XCODE_SETUP.md for configuration instructions.
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        defaults.set(url, forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if hasImage { defaults.set(true, forKey: "pendingShareHasImage") }
        defaults.synchronize()
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
