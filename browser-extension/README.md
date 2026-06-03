# TravelPanel Browser Extension

Clip any travel page into TravelPanel in one click — works in Chrome, Edge, Arc, and Safari (via Safari Web Extension converter).

## Features

- **One-click clip** — saves the current page to TravelPanel via the `/share` flow
- **Board picker** — choose Inbox or a recently-used board before clipping
- **Right-click context menu** — clip any link without opening the popup
- **Configurable URL** — works with self-hosted TravelPanel instances
- **Recent clips history** — view last 20 clips in Settings

## Install (Chrome / Edge / Arc)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Pin the TravelPanel icon to your toolbar

## Install (Safari — macOS)

Safari requires a native wrapper. Use Apple's converter tool:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Open the generated Xcode project, build, and enable the extension in Safari → Settings → Extensions.

## Configuration

Click the gear icon in the popup (or right-click the extension icon → Options) to:

- **App URL** — change if you run TravelPanel on a custom domain (default: `https://travelpanel.vercel.app`)

## How it works

The extension opens TravelPanel's existing `/share?url=...&title=...` page in a new tab.
All clip logic (IndexedDB save, AI enrichment, board assignment) runs inside TravelPanel itself —
the extension is purely a launcher. No separate backend or API key needed.

## Development

The extension uses Manifest V3 with no build step — edit the files and reload via `chrome://extensions`.

Files:
- `manifest.json` — extension config
- `popup.html` / `popup.js` — toolbar popup
- `options.html` / `options.js` — settings page
- `background.js` — service worker (context menu)
- `icons/` — 16/32/48/128px PNGs
