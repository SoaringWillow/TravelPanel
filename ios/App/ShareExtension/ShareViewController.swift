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
// Also captures any image attachment (e.g. 小红书 / WeChat post thumbnails)
// and writes it to App Group storage as "pendingShareImage" (base64 JPEG).
// The share page reads it from @capacitor/preferences and passes it to
// Claude Vision for extraction when HTML scraping is blocked.
//
// Supported source types: URLs, plain text containing a URL, web pages, images.

class ShareViewController: UIViewController {

    // App Group suite — must match the identifier in Xcode capabilities.
    private let appGroupSuite = "group.com.travelpanel.app"

    // ── Completion card ───────────────────────────────────────────────────────
    private lazy var overlayView: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        v.translatesAutoresizingMaskIntoConstraints = false
        v.alpha = 0
        return v
    }()

    private lazy var cardView: UIView = {
        let v = UIView()
        v.backgroundColor = .systemBackground
        v.layer.cornerRadius = 20
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.18
        v.layer.shadowRadius = 16
        v.layer.shadowOffset = CGSize(width: 0, height: 4)
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }()

    private lazy var iconLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 48)
        l.textAlignment = .center
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }()

    private lazy var titleLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 17, weight: .bold)
        l.textAlignment = .center
        l.numberOfLines = 2
        l.textColor = .label
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }()

    private lazy var bodyLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 14)
        l.textAlignment = .center
        l.numberOfLines = 0
        l.textColor = .secondaryLabel
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }()

    private lazy var closeButton: UIButton = {
        var config = UIButton.Configuration.filled()
        config.title = "Close"
        config.baseForegroundColor = .white
        config.baseBackgroundColor = UIColor(red: 0.99, green: 0.60, blue: 0.00, alpha: 1)
        config.cornerStyle = .large
        let b = UIButton(configuration: config)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.addTarget(self, action: #selector(handleClose), for: .touchUpInside)
        b.isHidden = true
        return b
    }()

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        setupCard()
        extractAndShare()
    }

    private func setupCard() {
        view.addSubview(overlayView)
        overlayView.addSubview(cardView)
        cardView.addSubview(iconLabel)
        cardView.addSubview(titleLabel)
        cardView.addSubview(bodyLabel)
        cardView.addSubview(closeButton)

        NSLayoutConstraint.activate([
            overlayView.topAnchor.constraint(equalTo: view.topAnchor),
            overlayView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlayView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            cardView.centerXAnchor.constraint(equalTo: overlayView.centerXAnchor),
            cardView.centerYAnchor.constraint(equalTo: overlayView.centerYAnchor),
            cardView.widthAnchor.constraint(equalToConstant: 260),

            iconLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 28),
            iconLabel.centerXAnchor.constraint(equalTo: cardView.centerXAnchor),

            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -20),

            bodyLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            bodyLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 20),
            bodyLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -20),

            closeButton.topAnchor.constraint(equalTo: bodyLabel.bottomAnchor, constant: 20),
            closeButton.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 20),
            closeButton.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -20),
            closeButton.heightAnchor.constraint(equalToConstant: 44),
            closeButton.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -24),
        ])
    }

    // ── Completion UI ─────────────────────────────────────────────────────────

    private func showSuccessUI() {
        DispatchQueue.main.async {
            self.iconLabel.text = "✅"
            self.titleLabel.text = "Saved to TravelPanel!"
            self.bodyLabel.text = "The app is opening to process your clip."
            self.closeButton.isHidden = true

            UIView.animate(withDuration: 0.25) { self.overlayView.alpha = 1 }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                self.finish()
            }
        }
    }

    private func showErrorUI() {
        DispatchQueue.main.async {
            self.iconLabel.text = "⚠️"
            self.titleLabel.text = "Couldn't save"
            self.bodyLabel.text = "No URL was found. Open TravelPanel and paste the URL manually."
            self.closeButton.isHidden = false

            UIView.animate(withDuration: 0.25) { self.overlayView.alpha = 1 }
        }
    }

    @objc private func handleClose() {
        finish()
    }

    // ── Extraction ────────────────────────────────────────────────────────────

    private func extractAndShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            showErrorUI()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            // Opportunistically capture an image from any attachment in this item.
            // This runs asynchronously and does not block the URL extraction path.
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    captureImage(from: attachment)
                    break
                }
            }

            // Priority 1: a direct URL attachment
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        guard let self else { return }
                        if let url = data as? URL {
                            let title = item.attributedContentText?.string ?? url.host ?? ""
                            self.openApp(url: url.absoluteString, title: title)
                        } else {
                            self.showErrorUI()
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
                            self.openApp(url: url, title: text)
                        } else {
                            self.showErrorUI()
                        }
                    }
                    return
                }
            }
        }

        showErrorUI()
    }

    // Loads an image attachment, resizes it to max 800px wide, and writes it to
    // App Group storage as a base64 JPEG for Claude Vision extraction.
    private func captureImage(from provider: NSItemProvider) {
        provider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
            guard let self else { return }
            var uiImage: UIImage?

            if let image = data as? UIImage {
                uiImage = image
            } else if let url = data as? URL, let imgData = try? Data(contentsOf: url) {
                uiImage = UIImage(data: imgData)
            } else if let imgData = data as? Data {
                uiImage = UIImage(data: imgData)
            }

            guard let image = uiImage else { return }
            let resized = self.resized(image, maxWidth: 800)
            guard let jpeg = resized.jpegData(compressionQuality: 0.65) else { return }
            let base64 = jpeg.base64EncodedString()
            self.savePendingImage(base64)
        }
    }

    private func resized(_ image: UIImage, maxWidth: CGFloat) -> UIImage {
        guard image.size.width > maxWidth else { return image }
        let ratio = maxWidth / image.size.width
        let newSize = CGSize(width: maxWidth, height: image.size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    private func savePendingImage(_ base64: String) {
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
            showErrorUI()
            return
        }

        // Open the main app with the deep link.
        // On iOS 13+, Share Extensions can open URLs via the responder chain.
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                showSuccessUI()
                application.open(deepLink, options: [:]) { _ in }
                return
            }
            responder = r.next
        }

        // Fallback: write to App Group and let the main app pick it up on next launch
        savePendingShareToAppGroup(url: url, title: title)
        showSuccessUI()
    }

    private func savePendingShareToAppGroup(url: String, title: String) {
        // App Group identifier must match the one configured in Xcode capabilities.
        // See XCODE_SETUP.md for configuration instructions.
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
