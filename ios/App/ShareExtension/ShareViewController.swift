import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a URL (and optional title + screenshot) from the iOS Share Sheet
// and opens the main TravelPanel app with travelpanel://share?url=...&title=...
//
// For anti-scraping platforms (xiaohongshu, WeChat, Douyin), also captures any
// image attachment and stores it base64-encoded in the App Group so the web layer
// can pass it to Claude Vision for extraction.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // Collected across async attachment loads
    private var collectedURL: String?
    private var collectedTitle: String?
    private var collectedImageBase64: String?
    private var pendingLoads = 0

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

            // Collect the title from the item attribution
            let candidateTitle = item.attributedContentText?.string ?? ""

            // Count how many async loads we're starting so we know when all are done
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    pendingLoads += 1
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL, self.collectedURL == nil {
                            self.collectedURL = url.absoluteString
                            self.collectedTitle = candidateTitle.isEmpty ? (url.host ?? "") : candidateTitle
                        }
                        self.loadDidFinish()
                    }
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    pendingLoads += 1
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String,
                           let urlStr = self.extractURL(from: text),
                           self.collectedURL == nil {
                            self.collectedURL = urlStr
                            self.collectedTitle = text
                        }
                        self.loadDidFinish()
                    }
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    pendingLoads += 1
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        let image: UIImage?
                        if let img = data as? UIImage {
                            image = img
                        } else if let url = data as? URL, let img = UIImage(contentsOfFile: url.path) {
                            image = img
                        } else {
                            image = nil
                        }

                        if let img = image, self.collectedImageBase64 == nil {
                            self.collectedImageBase64 = self.compressToBase64(img)
                        }
                        self.loadDidFinish()
                    }
                }
            }
        }

        // If nothing kicked off any loads, finish immediately
        if pendingLoads == 0 { finish() }
    }

    private func loadDidFinish() {
        pendingLoads -= 1
        if pendingLoads <= 0 {
            DispatchQueue.main.async {
                if let url = self.collectedURL {
                    self.openApp(url: url, title: self.collectedTitle ?? "")
                } else {
                    self.finish()
                }
            }
        }
    }

    // Resize to max 768px on the long edge and compress to JPEG ~50% quality.
    // Keeps the base64 payload small enough for App Group UserDefaults.
    private func compressToBase64(_ image: UIImage) -> String? {
        let maxDim: CGFloat = 768
        let w = image.size.width, h = image.size.height
        let scale = min(maxDim / max(w, h), 1.0)
        let newSize = CGSize(width: w * scale, height: h * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.5) else { return nil }
        return jpegData.base64EncodedString()
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func openApp(url: String, title: String) {
        // Always save to App Group — both the URL scheme path and the fallback path
        // will read from here so the image is available regardless of which path fires.
        savePendingShareToAppGroup(url: url, title: title, imageBase64: collectedImageBase64)

        var components = URLComponents()
        components.scheme = "travelpanel"
        components.host = "share"
        components.queryItems = [
            URLQueryItem(name: "url",   value: url),
            URLQueryItem(name: "title", value: title),
        ]

        guard let deepLink = components.url else { finish(); return }

        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(deepLink, options: [:]) { [weak self] _ in self?.finish() }
                return
            }
            responder = r.next
        }

        finish()
    }

    private func savePendingShareToAppGroup(url: String, title: String, imageBase64: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        defaults.set(Date(), forKey: "pendingShareDate")
        if let b64 = imageBase64 {
            defaults.set(b64, forKey: "pendingShareImageBase64")
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
