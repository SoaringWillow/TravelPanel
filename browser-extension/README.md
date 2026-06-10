# TravelPanel Clipper — Browser Extension

A Chrome (and Safari) extension that lets you clip any travel URL to your TravelPanel boards with one click.

## Features

- **One-click clipping** — clips the current tab to your TravelPanel app
- **Platform detection** — recognises Instagram, YouTube, TikTok, 小红书, Google Maps, Airbnb, and more
- **Keyboard shortcut** — `⌘⇧T` (Mac) / `Ctrl+Shift+T` (Windows) to clip without opening the popup
- **Board picker** — opens TravelPanel's share sheet so you can pick which board to save to
- **Works offline** — saves locally to your device via IndexedDB (no account needed)

---

## Installation (Chrome / Arc / Brave / Edge)

### 1. Generate icons (one-time setup)

Open `icons/generate.html` in your browser. Right-click each canvas → **Save image as…** → save as:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

Then add the icons to `manifest.json`:

```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
"action": {
  "default_popup": "popup.html",
  "default_title": "Clip to TravelPanel",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Load the extension

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder
5. The TravelPanel icon will appear in your toolbar

### 3. Configure your TravelPanel URL

1. Click the extension icon → **⚙️ gear icon** (top-right of popup)
2. Enter your TravelPanel URL — e.g. `https://your-app.vercel.app`
3. Click **Save**

---

## Installation (Safari on macOS)

Apple requires converting Chrome extensions to Safari Web Extensions using Xcode:

```bash
# Install Xcode Command Line Tools first
xcrun safari-web-extension-converter /path/to/TravelPanel/browser-extension
```

This generates an Xcode project. Build and run it to install the extension in Safari.

---

## Usage

1. Navigate to any travel page (Instagram post, YouTube video, TikTok, Xiaohongshu note, Google Maps location, blog post, etc.)
2. Click the **TravelPanel** icon in the toolbar (or press the keyboard shortcut)
3. The share sheet opens — pick a board or save to Inbox
4. Done! The clip is saved locally and AI extraction runs in the background

---

## Development

The extension is self-contained with no build step:

```
browser-extension/
  manifest.json    — Chrome Manifest V3
  popup.html       — Extension popup UI
  popup.js         — Popup logic (platform detection, clip action)
  options.html     — Settings page
  options.js       — Settings logic
  icons/
    generate.html  — Open in browser to generate PNG icons
    icon16.png     — (generated — add after running generate.html)
    icon48.png
    icon128.png
```

To reload after editing: go to `chrome://extensions` → click the ↺ refresh icon next to TravelPanel.

---

## How it works

1. **Popup** reads the current tab's URL and title via the `tabs` API
2. Detects the platform (Instagram, YouTube, etc.) and shows a platform chip
3. On "Clip" click, opens a small popup window pointed at `{travelPanelUrl}/share?url=...&title=...`
4. TravelPanel's existing share-sheet UI handles board selection and AI enrichment

No backend changes needed — this reuses the existing `/share` page.
