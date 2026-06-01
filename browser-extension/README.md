# TravelPanel Browser Extension

A Chrome/Safari extension that clips the current page's URL directly into your TravelPanel boards.

## How it works

1. Browse to any travel page (Instagram, YouTube, Xiaohongshu, etc.)
2. Click the TravelPanel extension icon
3. Click **Clip to TravelPanel**
4. The `/share` page opens in a new tab with the URL pre-filled
5. Choose a board and save — the AI extraction runs automatically

## Installing (Chrome / Arc / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

## Installing (Safari)

Safari requires converting the extension to a Safari Web Extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name TravelPanelClipper \
  --bundle-identifier com.yourname.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari → Preferences → Extensions.

## Configuration

Click the ⚙ gear icon in the popup to set your TravelPanel app URL (defaults to `https://travelpanel.vercel.app`). This is stored in `chrome.storage.sync` so it persists across devices.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome MV3 manifest |
| `popup.html` | Extension popup UI |
| `popup.css` | Popup styles (matches app design language) |
| `popup.js` | Platform detection, tab URL capture, settings |
| `background.js` | MV3 service worker (minimal) |
| `icons/` | 16×16, 48×48, 128×128 PNG icons |
