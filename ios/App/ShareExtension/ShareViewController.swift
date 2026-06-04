import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

// TravelPanel Share Extension — Native Board Picker
//
// Presents a compact native UI with board chips read from the App Group.
// The user taps a board (or Inbox) and the extension writes the clip
// directly to the App Group — no WebView cold-start needed.
//
// CapacitorBridge.tsx reads the pending clip on app foreground and calls
// saveItem() + enrichItem() without any navigation interruption.

class ShareViewController: UIViewController {

    private var capturedURL: String = ""
    private var capturedTitle: String = ""
    private var capturedImageBase64: String? = nil
    private var selectedBoardId: String? = nil
    private var boardButtons: [UIButton] = []
    private let appGroupSuite = "group.com.travelpanel.app"

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.systemBackground
        buildUI()
        extractContent()
    }

    // ── Native UI ──────────────────────────────────────────────────────────────

    private func buildUI() {
        // Drag handle
        let handle = UIView()
        handle.backgroundColor = UIColor.systemGray4
        handle.layer.cornerRadius = 2.5
        handle.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(handle)

        // Header: icon + title
        let iconLabel = UILabel()
        iconLabel.text = "✈️"
        iconLabel.font = .systemFont(ofSize: 28)
        iconLabel.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Save to TravelPanel"
        titleLabel.font = .boldSystemFont(ofSize: 18)
        titleLabel.textColor = .label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let headerStack = UIStackView(arrangedSubviews: [iconLabel, titleLabel])
        headerStack.axis = .horizontal
        headerStack.spacing = 10
        headerStack.alignment = .center
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerStack)

        // URL label
        let urlLabel = UILabel()
        urlLabel.text = "Loading…"
        urlLabel.font = .systemFont(ofSize: 12)
        urlLabel.textColor = .secondaryLabel
        urlLabel.numberOfLines = 1
        urlLabel.lineBreakMode = .byTruncatingMiddle
        urlLabel.translatesAutoresizingMaskIntoConstraints = false
        urlLabel.tag = 100
        view.addSubview(urlLabel)

        // "Save to" label
        let saveToLabel = UILabel()
        saveToLabel.text = "Save to:"
        saveToLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        saveToLabel.textColor = .secondaryLabel
        saveToLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(saveToLabel)

        // Board chips scroll view
        let scrollView = UIScrollView()
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.tag = 200
        view.addSubview(scrollView)

        let chipsStack = UIStackView()
        chipsStack.axis = .horizontal
        chipsStack.spacing = 8
        chipsStack.alignment = .center
        chipsStack.translatesAutoresizingMaskIntoConstraints = false
        chipsStack.tag = 201
        scrollView.addSubview(chipsStack)

        // Cancel button
        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .medium)
        cancelBtn.setTitleColor(.secondaryLabel, for: .normal)
        cancelBtn.layer.cornerRadius = 14
        cancelBtn.layer.borderWidth = 1.5
        cancelBtn.layer.borderColor = UIColor.systemGray4.cgColor
        cancelBtn.translatesAutoresizingMaskIntoConstraints = false
        cancelBtn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(cancelBtn)

        // Constraints
        NSLayoutConstraint.activate([
            handle.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            handle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            handle.widthAnchor.constraint(equalToConstant: 36),
            handle.heightAnchor.constraint(equalToConstant: 5),

            headerStack.topAnchor.constraint(equalTo: handle.bottomAnchor, constant: 16),
            headerStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            headerStack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),

            urlLabel.topAnchor.constraint(equalTo: headerStack.bottomAnchor, constant: 6),
            urlLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            urlLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            saveToLabel.topAnchor.constraint(equalTo: urlLabel.bottomAnchor, constant: 20),
            saveToLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            scrollView.topAnchor.constraint(equalTo: saveToLabel.bottomAnchor, constant: 10),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.heightAnchor.constraint(equalToConstant: 44),

            chipsStack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            chipsStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            chipsStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            chipsStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            chipsStack.heightAnchor.constraint(equalTo: scrollView.heightAnchor),

            cancelBtn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
            cancelBtn.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            cancelBtn.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            cancelBtn.heightAnchor.constraint(equalToConstant: 48),
        ])

        // Populate board chips
        populateBoardChips(in: chipsStack)
    }

    private func populateBoardChips(in stack: UIStackView) {
        // Always add "Inbox" first
        let inboxBtn = makeChipButton(emoji: "📥", name: "Inbox", boardId: nil)
        stack.addArrangedSubview(inboxBtn)
        boardButtons.append(inboxBtn)
        setChipSelected(inboxBtn)  // default selection

        // Read saved boards from App Group (written by the main app)
        if let defaults = UserDefaults(suiteName: appGroupSuite),
           let boardsJSON = defaults.string(forKey: "recentBoards"),
           let data = boardsJSON.data(using: .utf8),
           let boards = try? JSONSerialization.jsonObject(with: data) as? [[String: String]] {
            for board in boards.prefix(5) {
                guard let id = board["id"], let name = board["name"] else { continue }
                let emoji = board["emoji"] ?? "🗺"
                let btn = makeChipButton(emoji: emoji, name: name, boardId: id)
                stack.addArrangedSubview(btn)
                boardButtons.append(btn)
            }
        }
    }

    private func makeChipButton(emoji: String, name: String, boardId: String?) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle("\(emoji) \(name)", for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        btn.layer.cornerRadius = 18
        btn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.heightAnchor.constraint(equalToConstant: 36).isActive = true
        // Store boardId in accessibility identifier
        btn.accessibilityIdentifier = boardId ?? "__inbox__"
        btn.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
        setChipDeselected(btn)
        return btn
    }

    private func setChipSelected(_ btn: UIButton) {
        btn.backgroundColor = UIColor.systemIndigo
        btn.setTitleColor(.white, for: .normal)
        btn.layer.borderWidth = 0
    }

    private func setChipDeselected(_ btn: UIButton) {
        btn.backgroundColor = UIColor.systemGray6
        btn.setTitleColor(UIColor.label, for: .normal)
        btn.layer.borderWidth = 0
    }

    @objc private func chipTapped(_ sender: UIButton) {
        let boardId = sender.accessibilityIdentifier == "__inbox__" ? nil : sender.accessibilityIdentifier
        selectedBoardId = boardId

        for btn in boardButtons { setChipDeselected(btn) }
        setChipSelected(sender)

        // Auto-save immediately on chip tap
        saveAndClose()
    }

    @objc private func cancelTapped() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    // ── Content extraction ─────────────────────────────────────────────────────

    private func extractContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var allAttachments: [NSItemProvider] = []
        for item in items { allAttachments += item.attachments ?? [] }

        let group = DispatchGroup()
        var foundURL: String? = nil
        var foundTitle: String? = nil

        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    defer { group.leave() }
                    if let url = data as? URL, foundURL == nil {
                        foundURL = url.absoluteString
                        if let item = (self.extensionContext?.inputItems as? [NSExtensionItem])?.first {
                            foundTitle = item.attributedContentText?.string
                        }
                    }
                }
                break
            }
        }

        if foundURL == nil {
            for attachment in allAttachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String, foundURL == nil {
                            foundURL = self.extractURL(from: text)
                            foundTitle = text
                        }
                    }
                    break
                }
            }
        }

        for attachment in allAttachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                    defer { group.leave() }
                    guard let self = self, self.capturedImageBase64 == nil else { return }
                    var uiImage: UIImage? = nil
                    if let img = data as? UIImage { uiImage = img }
                    else if let raw = data as? Data { uiImage = UIImage(data: raw) }
                    else if let fileURL = data as? URL, let raw = try? Data(contentsOf: fileURL) { uiImage = UIImage(data: raw) }
                    if let img = uiImage {
                        let resized = self.resizeImage(img, maxDimension: 1024)
                        self.capturedImageBase64 = resized.jpegData(compressionQuality: 0.7)?.base64EncodedString()
                    }
                }
                break
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            self.capturedURL = foundURL ?? ""
            self.capturedTitle = foundTitle ?? ""
            if let urlLabel = self.view.viewWithTag(100) as? UILabel {
                urlLabel.text = self.capturedURL.isEmpty ? "No URL detected" : self.capturedURL
            }
        }
    }

    // ── Save & close ───────────────────────────────────────────────────────────

    private func saveAndClose() {
        guard !capturedURL.isEmpty else { finish(); return }
        writePendingClipToAppGroup()
        finish()
    }

    private func writePendingClipToAppGroup() {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }
        defaults.set(capturedURL, forKey: "pendingClipURL")
        defaults.set(capturedTitle, forKey: "pendingClipTitle")
        defaults.set(selectedBoardId, forKey: "pendingClipBoardId")
        if let image = capturedImageBase64 {
            defaults.set(image, forKey: "pendingShareImage")
            defaults.set("image/jpeg", forKey: "pendingShareImageMime")
        }
        defaults.synchronize()
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(text.startIndex..., in: text))
        return matches?.first.flatMap { $0.url?.absoluteString }
    }

    private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    private func finish() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
