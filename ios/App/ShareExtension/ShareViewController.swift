import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension
//
// Receives a shared item from the iOS Share Sheet, extracts URL + optional image,
// then shows a native board-picker action sheet so the user can route the clip
// directly to a board without opening the full app.
//
// Board data is read from the App Group shared UserDefaults ("savedBoards" key)
// which the main app mirrors via @capacitor/preferences after each board change.
//
// If no boards exist yet, falls back to opening the main app directly.

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        extractAndShowPicker()
    }

    // ── Entry point ────────────────────────────────────────────────────────────

    private func extractAndShowPicker() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish(); return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Priority 1: direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.captureImageIfPresent(from: attachments) { imageBase64 in
                                self.showBoardPicker(url: url.absoluteString, title: title, imageBase64: imageBase64)
                            }
                        } else { self.finish() }
                    }
                    return
                }
            }

            // Priority 2: plain text containing a URL
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let text = data as? String, let url = self.extractURL(from: text) {
                            self.captureImageIfPresent(from: attachments) { imageBase64 in
                                self.showBoardPicker(url: url, title: text, imageBase64: imageBase64)
                            }
                        } else { self.finish() }
                    }
                    return
                }
            }

            // Priority 3: image only
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        guard let img = self.imageFromLoadedItem(data) else { self.finish(); return }
                        let base64 = self.compressImage(img)
                        let title  = item.attributedTitle?.string ?? item.attributedContentText?.string ?? ""
                        self.saveImageToAppGroup(base64)
                        self.showBoardPicker(url: "travelpanel://image-clip", title: title, imageBase64: nil)
                    }
                    return
                }
            }
        }
        finish()
    }

    // ── Board picker ───────────────────────────────────────────────────────────

    private func showBoardPicker(url: String, title: String, imageBase64: String?) {
        let boards = loadBoardsFromAppGroup()

        // No boards yet — skip picker and open app directly
        if boards.isEmpty {
            savePendingShare(url: url, title: title, boardId: nil)
            openApp(url: url, title: title, imageBase64: imageBase64)
            return
        }

        DispatchQueue.main.async {
            let displayTitle = title.count > 70 ? String(title.prefix(70)) + "…" : title
            let alert = UIAlertController(
                title: "Save to TravelPanel",
                message: displayTitle.isEmpty ? nil : displayTitle,
                preferredStyle: .actionSheet
            )

            // Inbox (no board)
            alert.addAction(UIAlertAction(title: "📥  Inbox", style: .default) { [weak self] _ in
                self?.savePendingShare(url: url, title: title, boardId: nil)
                self?.openApp(url: url, title: title, imageBase64: imageBase64)
            })

            // One action per board
            for board in boards {
                let emoji = board["emoji"] ?? "🗺"
                let name  = board["name"]  ?? "Board"
                let id    = board["id"]    ?? ""
                alert.addAction(UIAlertAction(title: "\(emoji)  \(name)", style: .default) { [weak self] _ in
                    self?.savePendingShare(url: url, title: title, boardId: id)
                    self?.openApp(url: url, title: title, imageBase64: imageBase64)
                })
            }

            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in
                self?.finish()
            })

            self.present(alert, animated: true)
        }
    }

    private func loadBoardsFromAppGroup() -> [[String: String]] {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app"),
              let json  = defaults.string(forKey: "savedBoards"),
              let data  = json.data(using: .utf8),
              let array = try? JSONSerialization.jsonObject(with: data) as? [[String: String]]
        else { return [] }
        return array
    }

    // ── Persist pending share ──────────────────────────────────────────────────

    private func savePendingShare(url: String, title: String, boardId: String?) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(url,   forKey: "pendingShareURL")
        defaults.set(title, forKey: "pendingShareTitle")
        if let boardId {
            defaults.set(boardId, forKey: "pendingShareBoardId")
        } else {
            defaults.removeObject(forKey: "pendingShareBoardId")
        }
        defaults.set(Date(), forKey: "pendingShareDate")
        defaults.synchronize()
    }

    // ── Image helpers ──────────────────────────────────────────────────────────

    private func captureImageIfPresent(
        from attachments: [NSItemProvider],
        completion: @escaping (String?) -> Void
    ) {
        for attachment in attachments where attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                guard let self else { completion(nil); return }
                if let img = self.imageFromLoadedItem(data) {
                    let base64 = self.compressImage(img)
                    self.saveImageToAppGroup(base64)
                    completion(base64)
                } else { completion(nil) }
            }
            return
        }
        completion(nil)
    }

    private func imageFromLoadedItem(_ data: NSSecureCoding?) -> UIImage? {
        if let img = data as? UIImage { return img }
        if let url = data as? URL    { return UIImage(contentsOfFile: url.path) }
        if let raw = data as? Data   { return UIImage(data: raw) }
        return nil
    }

    private func compressImage(_ image: UIImage) -> String {
        let maxDim: CGFloat = 800
        let scale   = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
        let newSize = CGSize(width: floor(image.size.width * scale),
                             height: floor(image.size.height * scale))
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized  = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
        let data     = resized.jpegData(compressionQuality: 0.65) ?? Data()
        return data.base64EncodedString()
    }

    private func saveImageToAppGroup(_ base64: String) {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app") else { return }
        defaults.set(base64, forKey: "pendingShareImageData")
        defaults.synchronize()
    }

    // ── URL helpers ────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches  = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    // ── App open ───────────────────────────────────────────────────────────────

    private func openApp(url: String, title: String, imageBase64: String?) {
        var components        = URLComponents()
        components.scheme     = "travelpanel"
        components.host       = "share"
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

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
