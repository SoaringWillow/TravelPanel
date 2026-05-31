# TravelPanel Browser Extension

Clip any travel post into your TravelPanel boards with one click — from Chrome, Edge, or any Chromium-based browser.

## Features

- **One-click clip**: Click the extension icon to clip the current page into TravelPanel.
- **Right-click clip**: Right-click any link or page → "Clip to TravelPanel".
- **Platform detection**: Automatically shows the platform badge (Instagram, YouTube, etc.).
- **Configurable app URL**: Point to your local dev server or your Vercel deployment.

## Installation (Developer Mode)

1. Generate the icons (only needed once):
   ```
   node generate-icons.js
   ```

2. Open Chrome and navigate to `chrome://extensions`.

3. Enable **Developer mode** (toggle top-right).

4. Click **Load unpacked** and select this `browser-extension/` folder.

5. The 🗺️ TravelPanel Clipper icon appears in your toolbar.

## Configuration

Click the ⚙️ gear icon in the popup to set your TravelPanel URL:

- **Production**: `https://your-app.vercel.app`
- **Local dev**: `http://localhost:3000`

The URL is saved to `chrome.storage.sync` and persists across sessions.

## How it works

Clicking "Clip to TravelPanel" opens `{appUrl}/share?url=...&title=...` in a new tab, where the existing share flow handles board selection and AI extraction.

## Safari Support

To use in Safari on macOS (Ventura+):

1. Open Xcode → File → New → Project → Safari Web Extension.
2. Import this extension using the Xcode converter tool (`xcrun safari-web-extension-converter browser-extension/`).
3. Build and run from Xcode; enable the extension in Safari Settings → Extensions.
