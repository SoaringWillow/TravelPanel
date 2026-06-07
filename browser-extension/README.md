# TravelPanel Clipper — Browser Extension

One-click clipping of any travel page (blog, YouTube, Instagram, Xiaohongshu) into TravelPanel for AI extraction of locations and travel wisdom.

## Install in Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

The TravelPanel globe icon appears in your toolbar.

## Install in Safari (macOS 14+)

Safari requires wrapping the extension as a macOS app via **Safari Web Extension Converter**:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it (⌘B), and enable the extension in **Safari → Settings → Extensions**.

## Usage

1. Navigate to any travel page
2. Click the TravelPanel globe icon in your toolbar
3. Click **Clip to TravelPanel** — your app opens with the URL pre-filled
4. TravelPanel's AI extracts locations, tips, warnings, and travel wisdom automatically

## Settings

Click the ⚙️ Settings link in the popup to configure your TravelPanel URL (useful for local development or a custom deployment).

| Setting | Default |
|---|---|
| App URL | `https://travelpanel.vercel.app` |

For local dev, set to `http://localhost:3000`.

## How It Works

The extension reads only the current tab URL and title. It opens TravelPanel with `?import=<url>` appended, triggering the existing import flow. **No page content is read by the extension** — extraction happens server-side via the `/api/import` endpoint.

## File Layout

```
browser-extension/
  manifest.json     — Chrome Manifest V3
  popup.html        — Extension popup UI
  popup.js          — Popup logic (tab detection, clip action)
  options.html      — Settings page UI
  options.js        — Settings page logic
  icons/
    icon16.png      — Toolbar icon (16×16)
    icon48.png      — Extension manager icon (48×48)
    icon128.png     — Chrome Web Store icon (128×128)
```
