# TravelPanel Browser Extension

A Chrome/Edge/Brave extension (Manifest V3) that clips the current page URL into TravelPanel with one click. Safari users can convert it using Xcode's "Convert to Safari Web Extension" tool.

## What it does

- **Toolbar popup** — shows the current page title + platform badge (Instagram, YouTube, Xiaohongshu, WeChat, Bilibili, etc.), then opens the TravelPanel `/share` flow
- **Right-click context menu** — "Clip to TravelPanel" on any page or link
- **Keyboard shortcut** — `Alt+Shift+C` (Mac: `Ctrl+Shift+C`) clips the active tab instantly
- **Settings page** — configure your deployed TravelPanel URL

## Install in Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this repo

The TravelPanel icon will appear in your toolbar.

## Configure the app URL

After installing, click the ⚙️ settings icon in the popup and enter your deployed TravelPanel URL (e.g. `https://your-app.vercel.app`). Without this, the extension defaults to `https://travelpanel.vercel.app`.

## Convert for Safari (macOS / iOS)

```bash
xcrun safari-web-extension-converter /path/to/TravelPanel/extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Open the generated Xcode project, set your Team, then build and run. This produces a macOS app that registers the Safari extension.

## How clipping works

The extension opens your TravelPanel app at:

```
<app-url>/share?url=<encoded-page-url>&title=<encoded-page-title>
```

The `/share` page (already in TravelPanel) handles the full clip flow: board selection, IndexedDB save, and background AI enrichment. No separate API keys or credentials needed in the extension itself.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome Manifest V3 config, permissions, shortcuts |
| `popup.html / popup.js` | Toolbar popup UI + logic |
| `background.js` | Service worker: context menu + keyboard shortcut |
| `settings.html / settings.js` | Options page for configuring the app URL |
| `icons/` | PNG icons (16, 32, 48, 128px) |
