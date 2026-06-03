# TravelPanel Clipper — Browser Extension

A Manifest V3 browser extension for Chrome, Edge, and Safari that clips any travel inspiration page to your TravelPanel boards with one click.

## Features

- **One-click clip** — popup shows the current page title and URL; press Save to open the TravelPanel share page
- **Optional quick note** — add a short note before saving
- **Context menu** — right-click any page or link → "Save to TravelPanel"
- **Keyboard shortcut** — `Alt+Shift+T` (Windows/Linux) or `⌘+Shift+T` (Mac)
- **Platform detection** — recognises Instagram, YouTube, Xiaohongshu, TikTok, Douyin, Bilibili, Weibo, Pinterest
- **Configurable app URL** — works with localhost dev server or your Vercel deployment

## Quick Start

### Chrome / Edge / Arc

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` directory

The TravelPanel pin icon will appear in the toolbar. Click the puzzle icon → pin it for easy access.

### Safari

Safari requires converting the extension using Xcode:

```bash
xcrun safari-web-extension-converter /path/to/TravelPanel/extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Open the generated Xcode project, set your Apple Developer team, then build and run. Enable the extension in **Safari → Settings → Extensions**.

## Configuration

Click the ⚙️ gear icon in the popup (or right-click the toolbar icon → Options) to set the app URL:

| Environment | URL |
|---|---|
| Local development | `http://localhost:3000` |
| Vercel production | `https://your-app.vercel.app` |

## Regenerating Icons

Icons are pre-generated as PNG files. To regenerate them (requires only Node.js, no extra packages):

```bash
node generate-icons.js
```

## File Structure

```
extension/
├── manifest.json       # MV3 extension manifest
├── popup.html          # Toolbar popup UI
├── popup.js            # Popup logic
├── background.js       # Service worker (context menus, keyboard shortcut)
├── options.html        # Settings page
├── options.js          # Settings logic
├── generate-icons.js   # Node.js icon generator (run once)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Permissions Used

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `storage` | Persist the configured app URL |
| `contextMenus` | Add right-click "Save to TravelPanel" menu items |

No browsing history, no cookies, no external requests — all data stays local.
