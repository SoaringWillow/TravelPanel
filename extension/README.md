# TravelPanel Browser Extension

Clip travel inspiration from any website into TravelPanel with one click.

## Features

- **One-click clip** — sends the current tab's URL and title to TravelPanel's `/share` flow
- **Platform detection** — recognises Instagram, YouTube, Xiaohongshu, TikTok, TripAdvisor, etc. with a colour-coded chip
- **Right-click context menu** — "Clip this page / link to TravelPanel" on any page or link
- **Keyboard shortcut** — `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- **Configurable URL** — point the extension at your own TravelPanel deployment

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The TravelPanel pin icon appears in your toolbar

## Install (Safari)

Use Xcode's Safari Web Extension Converter:

```bash
xcrun safari-web-extension-converter /path/to/TravelPanel/extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Then build & run the generated Xcode project, enable the extension in
Safari → Settings → Extensions.

## Configuration

Click the gear icon in the popup to set your TravelPanel URL:

- **Default**: `https://travelpanel.vercel.app`
- **Custom**: your own Vercel / self-hosted deployment URL

The setting is synced across Chrome profiles via `chrome.storage.sync`.

## Regenerating Icons

If you need to rebuild the icons:

```bash
cd extension
python3 gen_icons.py
```

Requires Python 3 (stdlib only — no extra packages needed).

## How It Works

1. Extension popup gets the active tab's URL + title
2. Detects the platform from the URL
3. On "Clip" click: opens `<appUrl>/share?url=<encoded>&title=<encoded>` in a new tab
4. TravelPanel's share page lets the user choose a board, then enqueues enrichment via Claude

The extension never stores your browsing history. It only reads the active tab's URL/title when you open the popup.
