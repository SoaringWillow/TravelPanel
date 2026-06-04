# TravelPanel Clipper — Browser Extension

A Chrome (and Safari-compatible) extension that saves travel inspiration from any web page directly into TravelPanel.

## Features

- **One-click clip** — click the toolbar icon to save the current page to TravelPanel
- **Right-click clip** — "Save page/link to TravelPanel" context menu on any page or link
- **Platform detection** — recognises YouTube, Instagram, 小红书, TikTok, Bilibili, X/Twitter, Google Maps, TripAdvisor, and generic web pages
- **Smart tab reuse** — if TravelPanel is already open, the clip navigates that tab instead of opening a new one
- **Configurable URL** — point the extension at your local dev server or any deployed instance

---

## Installing in Chrome / Chromium / Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The TravelPanel Clipper icon appears in your toolbar (pin it for easy access)

### First-time setup

Click the extension icon → ⚙️ Settings and set the **TravelPanel URL**:

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` (default) |
| Vercel | `https://your-app.vercel.app` |

---

## Installing in Safari (macOS)

Safari requires extensions to be packaged as a native app via Xcode.

### Prerequisites
- macOS 12+
- Xcode 14+
- Apple Developer account (free tier works for personal use)

### Steps

1. Install the [Xcode Command Line Tools](https://developer.apple.com/download/more/) if you haven't
2. Run the converter from inside this directory:
   ```bash
   xcrun safari-web-extension-converter extension/ \
     --project-location . \
     --app-name "TravelPanel Clipper" \
     --bundle-identifier com.travelpanel.clipper
   ```
3. Open the generated Xcode project, select your team in Signing & Capabilities, then **Product → Run**
4. In Safari → Settings → Extensions, enable **TravelPanel Clipper**

---

## How clipping works

1. Browse to any travel-inspiration page (YouTube video, Instagram post, 小红书 link, etc.)
2. Click the TravelPanel Clipper icon **or** right-click → "Save page to TravelPanel"
3. TravelPanel opens (or focuses the existing tab) with the URL pre-filled in the import field
4. TravelPanel's AI extracts locations, activities, and wisdom from the page
5. Review and save to a board

---

## Development

The extension uses Manifest V3 with:
- `background.js` — service worker; draws the toolbar icon with OffscreenCanvas, registers context menus
- `popup.html` + `popup.js` — popup UI; reads the active tab URL, shows a preview card, and triggers the clip
- `chrome.storage.sync` — persists the configured TravelPanel URL across devices

No build step required — the files are plain ES2020 JavaScript.
