# TravelPanel Browser Extension

Clip any travel page to your TravelPanel boards in one click — Chrome, Edge, and Safari.

## Features

- **One-click clip**: Click the extension icon to save the current page to TravelPanel
- **Context menu**: Right-click any page or link → "Clip to TravelPanel"
- **OG metadata extraction**: Picks up the best title and thumbnail from the page's Open Graph tags
- **Configurable URL**: Point the extension at your local dev server or custom deployment
- **Auto-close popup**: The clip window closes itself after saving

## Install in Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo

The TravelPanel pin icon will appear in your toolbar. If not visible, click the puzzle-piece icon and pin it.

## Install in Safari

Safari requires the extension to be packaged via Xcode. Use Apple's converter tool:

```bash
# One-time setup
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-id com.travelpanel.clipper \
  --macos-only
```

Then open the generated Xcode project, build it, and enable the extension in
**Safari → Settings → Extensions**.

## Usage

### Clip current page
Click the TravelPanel pin icon in the toolbar. A small popup window opens showing
the TravelPanel share page — choose a board and click Save.

### Clip a link without visiting it
Right-click any hyperlink → **"Clip this link to TravelPanel"**.

### Configure your TravelPanel URL
Click the gear icon in the extension popup, or right-click the toolbar icon →
**Options**. Enter your deployment URL (e.g. `https://myapp.vercel.app`) and save.

| Preset | URL |
|--------|-----|
| Production | `https://travelpanel.vercel.app` |
| Local dev  | `http://localhost:3000` |

## Development

The extension uses Manifest V3 and has no build step — load it directly as an
unpacked extension. Changes to any file take effect after clicking the reload
button on `chrome://extensions`.

```
browser-extension/
├── manifest.json     # MV3 config, permissions, content scripts
├── background.js     # Service worker: context menu, programmatic icon
├── content.js        # Runs in every page: extracts OG metadata
├── popup.html/js/css # Extension toolbar popup
├── options.html/js   # Settings page (configure TravelPanel URL)
└── README.md
```

## How it integrates with TravelPanel

The extension opens `{PANEL_URL}/share?url=...&title=...&source=extension`.
The `source=extension` param tells the share page to call `window.close()`
instead of `history.back()` when the user dismisses — so the popup window
closes cleanly.

No backend changes are required. The extension uses the same `/share` page
flow as the iOS Share Extension.
