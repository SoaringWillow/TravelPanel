# TravelPanel Browser Extension

A Chrome/Edge/Brave extension (and Safari Web Extension) that clips any travel URL into TravelPanel with one click.

## Features

- **One-click clipping** — clip any travel page to your TravelPanel boards
- **Platform detection** — recognizes WeChat, Little Red Book (小红书), Douyin/TikTok, Bilibili, and any web URL
- **Smart tab reuse** — navigates your existing TravelPanel tab instead of opening a new one every time
- **Context menu** — right-click any page or link → "Clip to TravelPanel"
- **Keyboard shortcut** — `Alt+Shift+S` clips the current tab instantly
- **Configurable URL** — works with any TravelPanel deployment (Vercel, self-hosted, localhost)

## Install (Chrome / Edge / Brave — Developer Mode)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The TravelPanel globe icon appears in your toolbar

> **Tip**: Pin the extension to your toolbar for one-click access.

## Install (Safari — requires macOS + Xcode)

Convert the extension to a Safari Web Extension:
```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name TravelPanel \
  --bundle-identifier com.travelpanel.clipper
```
Then open the generated Xcode project, build, and enable in Safari → Preferences → Extensions.

## Configuration

Click the ⚙️ gear icon in the popup to set your TravelPanel URL:
- Default: `https://travelpanel.vercel.app`
- For local dev: `http://localhost:3000`
- For your own deployment: `https://your-app.vercel.app`

Settings are synced across your Chrome profile via `chrome.storage.sync`.

## How it Works

When you clip a URL, the extension opens TravelPanel with `?import=<encoded_url>`. TravelPanel's home page detects this parameter, opens the Import Sheet with the URL pre-filled, and begins AI-powered extraction of:
- **Locations** — geographic pins with GPS coordinates
- **Substance** — tips, warnings, opinions, and wisdom from the post

## File Structure

```
browser-extension/
  manifest.json      — Extension manifest (MV3)
  popup.html         — Popup UI
  popup.js           — Popup logic (platform detection, clip action, settings)
  background.js      — Service worker (context menu, keyboard shortcut)
  icons/
    icon.svg         — Master SVG icon (globe + pin)
    icon16.svg       — 16×16 toolbar icon
    icon32.svg       — 32×32
    icon48.svg       — 48×48
    icon128.svg      — 128×128 (Chrome Web Store)
```

## Permissions Used

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `tabs` | Query and update TravelPanel tab by URL |
| `storage` | Save configured TravelPanel app URL |
| `contextMenus` | Right-click "Clip to TravelPanel" menu items |
