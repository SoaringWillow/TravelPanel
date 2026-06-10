# TravelPanel Clipper — Browser Extension

Clip any travel inspiration page (Instagram, YouTube, Xiaohongshu, TikTok, Bilibili, or any URL) into TravelPanel with one click.

## Features

- **One-click clip** — click the toolbar icon on any page to save it
- **Right-click menu** — right-click any link or image → "Clip to TravelPanel"
- **Platform detection** — recognises Xiaohongshu, WeChat, Douyin/TikTok, Bilibili
- **Board selector** — choose which board to save to (or leave in Inbox)
- **Page preview** — shows OG thumbnail, title, and URL before clipping
- **Configurable URL** — works with local dev server or your Vercel deployment

## Install (Chrome / Edge / Brave)

1. **Generate icons** (one-time):
   ```bash
   cd browser-extension
   node generate-icons.js
   ```

2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `browser-extension/` folder
5. Click the puzzle icon in Chrome's toolbar → pin **TravelPanel Clipper**

## Configure

1. Click the extension icon → gear icon (⚙️), or right-click the icon → Options
2. Enter your TravelPanel URL:
   - Local dev: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
3. Click **Save**

## Install (Safari)

Safari requires converting the extension with Xcode's Safari Web Extension Converter:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari → Settings → Extensions.

## How it works

Clicking "Clip this page" opens TravelPanel's `/share` page with the current URL pre-filled (same flow as the iOS Share Sheet). TravelPanel then:
1. Saves the item to your board
2. Enriches it in the background via Claude — extracting locations, tips, warnings, and travel wisdom
3. Shows it on your map and in your boards

## Development

The extension is vanilla JS with no build step. Edit files directly, then reload the extension in `chrome://extensions`.

Files:
- `manifest.json` — Extension manifest (Manifest V3)
- `popup.html/js/css` — Toolbar popup UI
- `background.js` — Service worker (right-click context menus)
- `options.html/js/css` — Settings page
- `generate-icons.js` — PNG icon generator (run once with Node.js)
- `icons/` — Generated PNG icons
