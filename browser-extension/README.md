# TravelPanel Browser Extension

Clip any travel page — Instagram, YouTube, 小红书, TikTok, or any website — directly into TravelPanel with one click.

## What it does

- **Toolbar popup**: click the TravelPanel icon to see the current page's platform, title, and URL. One button saves it.
- **Context menu**: right-click any link (or the page itself) → *Save to TravelPanel* — clips without navigating.
- **Smart platform detection**: auto-detects Instagram, YouTube, 小红书, TikTok, Douyin, Bilibili, Twitter/X, Google Maps, Tripadvisor, Airbnb, Booking.com, Pinterest, and Lonely Planet.
- **Configurable URL**: point it at any TravelPanel deployment (Vercel, local dev, self-hosted).

After clipping, TravelPanel's AI extracts **locations + substance** (tips, warnings, best times to visit) from the page automatically.

## Installation (Chrome / Edge / Brave)

### 1. Generate icons (one-time)

```bash
node generate-icons.js
```

This creates `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png` using only Node.js built-ins — no npm install required.

### 2. Load the extension

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

The TravelPanel icon appears in your toolbar.

### 3. Configure (optional)

Click the ⚙ Settings link in the popup to change the TravelPanel URL. Default is `https://travelpanel.vercel.app`. Set it to `http://localhost:3000` for local development.

## Installation (Safari)

Safari requires converting the extension to a Safari Web Extension via Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari → Settings → Extensions.

## File overview

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3, Chrome/Edge/Brave/Safari) |
| `popup.html/css/js` | Toolbar popup UI |
| `options.html/css/js` | Settings page (configure TravelPanel URL) |
| `background.js` | Service worker — installs context menu, handles right-click clip |
| `generate-icons.js` | Generates PNG icons from scratch, no dependencies |
| `icons/icon.svg` | Source icon (SVG, for reference) |
| `icons/icon*.png` | Generated PNG icons (run generate-icons.js first) |

## Development

The extension uses no bundler — plain HTML/CSS/JS. Edit files and click the reload button in `chrome://extensions` to see changes.

To point at a local TravelPanel dev server:
1. Open the extension popup → Settings
2. Set URL to `http://localhost:3000`
3. Save
