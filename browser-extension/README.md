# TravelPanel Clipper — Browser Extension

A Chrome/Edge/Arc extension that clips the current page URL into your TravelPanel boards.

## Features

- **One-click clip** — saves the current tab to TravelPanel's share page
- **Platform detection** — recognises Instagram, YouTube, Xiaohongshu, Douyin, Bilibili, WeChat, and more
- **Board picker** — select a destination board directly from the popup (synced from the app)
- **Right-click menu** — "Clip to TravelPanel" on any page or link
- **Configurable URL** — point at localhost for dev or your Vercel deploy for production

## Installing (Chrome / Edge / Arc)

1. **Generate icons** (first time only):
   ```bash
   python3 generate-icons.py
   ```
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `browser-extension/` folder
5. The 🗺 TravelPanel icon appears in your toolbar

## Configuration

Click the ⚙ settings icon in the popup (or the extension's options page) to set the TravelPanel URL:

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Production | Your Vercel URL |

## How It Works

| Component | Purpose |
|---|---|
| `popup.html / popup.js` | Extension popup — shows URL, platform badge, board picker |
| `background.js` | Service worker — handles context menu and board sync |
| `content.js` | Injected into TravelPanel pages — reads IndexedDB boards and syncs to Chrome storage |
| `options.html / options.js` | Settings page — configure TravelPanel URL |

### Board Sync

The extension reads your boards from TravelPanel's IndexedDB via a content script (injected on TravelPanel pages). After you open TravelPanel once, the popup will show your boards for quick selection.

### Clip Flow

1. User clicks the extension icon or right-clicks a page
2. Popup shows current URL + detected platform
3. User picks a board (optional — defaults to Inbox)
4. Clicking **Clip to TravelPanel** opens `<appUrl>/share?url=<url>&title=<title>&boardId=<id>`
5. The TravelPanel share page handles enrichment + board assignment

## Regenerating Icons

```bash
python3 generate-icons.py
```

This generates 16×32×48×128 px PNG icons using only Python stdlib (no Pillow required).

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 109+ | ✅ Full support (Manifest V3) |
| Edge 109+ | ✅ Full support |
| Arc | ✅ Full support |
| Firefox | ⚠ Requires minor manifest adjustments (MV2) |
| Safari | ⚠ Requires Xcode + Safari Web Extension conversion |
