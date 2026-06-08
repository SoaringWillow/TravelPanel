# TravelPanel Clipper — Browser Extension

Chrome (and Safari via Web Extension wrapper) extension that clips any travel page into TravelPanel with one click.

## Features

- **One-click clip** — Click the toolbar icon to clip the current page
- **Context menu** — Right-click any page or link → "Clip to TravelPanel"
- **Platform detection** — Recognises Instagram, YouTube, Xiaohongshu, TikTok, Bilibili, WeChat, Pinterest, and generic web pages
- **Smart redirect** — Opens TravelPanel's share flow where Claude extracts spots + substance

## Install (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` directory
5. Click the TravelPanel icon → **Settings** (⚙) → enter your TravelPanel URL → **Save**

## Install (Safari)

Use Xcode's **Web Extension** converter:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension --project-location ~/Desktop
```

Then open the generated Xcode project, build to your Mac/device, and enable in Safari → Preferences → Extensions.

## Configuration

Open the extension settings (⚙ icon in the popup) and enter your TravelPanel URL, e.g.:

```
https://your-app.vercel.app
```

Click **Test Connection** to verify the extension can reach your TravelPanel API.

## How clipping works

1. User clicks the extension icon on any travel page
2. Extension opens `<TravelPanel URL>/share?url=<page-url>&title=<page-title>` in a new tab
3. TravelPanel's share flow calls Claude to extract locations + substance (tips, warnings, wisdom)
4. The clip lands in the user's **Inbox**

This mirrors the iOS Share Sheet flow exactly — the same `/share` page handles both.

## Development

The extension uses **Manifest V3** (Chrome) with:
- `activeTab` — read the current tab's URL and title
- `storage` — save the configured TravelPanel URL
- `contextMenus` — right-click → Clip to TravelPanel

No build step required; all files are plain HTML/CSS/JS.
