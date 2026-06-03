# TravelPanel Clipper — Browser Extension

Clip travel content from any webpage into TravelPanel with one click. The extension calls the TravelPanel `/api/import` endpoint to extract locations and wisdom, then redirects to the TravelPanel share page for saving.

## Installation (Chrome / Arc / Brave)

1. Open `chrome://extensions` in your browser
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The TravelPanel icon appears in your toolbar

## Installation (Safari)

Safari requires converting to a Safari Web Extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension/
```

Then follow Xcode prompts to build and install.

## Configuration

Click the ⚙️ gear icon in the popup to set your TravelPanel server URL:

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Vercel production | `https://your-app.vercel.app` |

The URL is saved in `chrome.storage.sync` and syncs across your signed-in Chrome profile.

## How It Works

1. **Click the extension icon** on any travel webpage
2. **Preview** shows the page title and URL  
3. **Click "Clip This Page"** — the extension calls `POST /api/import` and displays extracted locations and tips count
4. **Click "Save to TravelPanel"** — opens `/share?url=...` where you can choose a board and confirm saving

## CORS Note

The extension's fetch to `/api/import` is a cross-origin request. The TravelPanel API includes `Access-Control-Allow-Origin: *` on that endpoint to allow extension calls.

## File Structure

```
browser-extension/
  manifest.json     — Chrome Manifest V3
  popup.html        — Extension popup UI
  popup.css         — Popup styles
  popup.js          — Popup logic (fetch + state machine)
  background.js     — Service worker (minimal)
  icons/
    icon16.png
    icon48.png
    icon128.png
```
