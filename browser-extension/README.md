# TravelPanel Clipper — Browser Extension

Clip any travel page to your TravelPanel boards with one click. Works in Chrome, Edge, Brave, and Safari (via Safari Web Extension Converter).

---

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo

The TravelPanel Clipper icon appears in your toolbar.

---

## Configure

1. Click the extension icon → **⚙ settings** (gear icon top-right)
2. Enter your TravelPanel URL, e.g.:
   - Local dev: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
3. Click **Save settings**

---

## Usage

1. Navigate to any travel page (Instagram, YouTube, Xiaohongshu, blog, etc.)
2. Click the TravelPanel Clipper icon in the toolbar
3. Click **Clip this page**
4. The TravelPanel share page opens — choose a board and save

The extension detects the platform (Instagram, YouTube, TikTok, X, 小红书, or Web) and labels it in the popup.

---

## Safari (macOS / iOS)

Use Apple's [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari):

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier app.travelpanel.clipper
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Chrome MV3) |
| `popup.html/js` | Toolbar popup — detect platform, clip page |
| `options.html/js` | Settings page — configure TravelPanel URL |
| `icons/*.svg` | Extension icons (16, 48, 128 px) |

---

## Adding PNG Icons (optional)

Chrome's Extensions settings page (chrome://extensions) shows the icon from the `icons` field in `manifest.json`, which requires PNG files. The SVGs in `icons/` work for the toolbar button. To add PNGs:

1. Open each SVG in Inkscape or Figma
2. Export as PNG at 16×16, 48×48, 128×128
3. Save as `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
4. Add to `manifest.json`:
   ```json
   "icons": {
     "16": "icons/icon16.png",
     "48": "icons/icon48.png",
     "128": "icons/icon128.png"
   }
   ```
