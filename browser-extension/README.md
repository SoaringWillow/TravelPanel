# TravelPanel Clipper — Browser Extension

Clips the current page URL into TravelPanel with one click.  
Works in Chrome, Edge, Brave, and (via Xcode wrapper) Safari.

## Features

- **Popup clipper** — click the extension icon to see the current page and send it to TravelPanel
- **Context menu** — right-click any page or link → "Clip this page / link to TravelPanel"
- **Platform detection** — recognises Xiaohongshu, TikTok/Douyin, Bilibili, YouTube, Instagram
- **Configurable URL** — point the extension at your local dev server or production deployment

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this `browser-extension/` folder
4. The ✈ icon appears in the toolbar — pin it for easy access

## Configure the TravelPanel URL

Click the ⚙ gear icon in the popup and enter your TravelPanel base URL:

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Vercel production | `https://your-app.vercel.app` |

The setting is synced across your Chrome profile via `chrome.storage.sync`.

## Convert to Safari Extension (macOS)

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Open the generated Xcode project, build, and enable the extension in  
**Safari → Settings → Extensions**.

## How it works

Clicking **Clip to TravelPanel** opens TravelPanel at:

```
<base-url>/?import=<encoded-url>
```

TravelPanel's home page (`app/page.tsx`) watches for the `?import=` search param  
and auto-opens the import sheet with the URL pre-filled, triggering the Claude  
extraction flow.

## Adding custom icons (optional)

Place 16×16, 48×48, and 128×128 PNG files in the `icons/` folder and update  
`manifest.json`:

```json
"action": {
  "default_icon": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```
