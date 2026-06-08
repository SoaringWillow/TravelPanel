# TravelPanel Clipper — Browser Extension

Chrome/Edge/Brave extension (MV3) that clips any travel URL into your TravelPanel boards in one click.

## Features

- **One-click clip** — saves current page to any board or Inbox
- **Board picker** — auto-loads your boards when TravelPanel is open in a tab (reads IndexedDB directly)
- **Board cache** — boards stay cached for fast access even when TravelPanel is closed
- **Notes** — add a quick note before saving
- **Context menu** — right-click any page or link → "Save to TravelPanel"
- **Pre-selected board** — when opened from a board page, that board is auto-highlighted
- **Extension popup window** — opens the TravelPanel share page in a compact popup, auto-closes after saving

## Install (Developer Mode)

1. **Generate icons** (first time only):
   ```bash
   node browser-extension/scripts/generate-icons.js
   ```

2. Open Chrome → `chrome://extensions/`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** → select the `browser-extension/` folder

5. Open the extension settings (⚙️ icon in popup) and set your TravelPanel URL:
   - Local dev: `http://localhost:3000`
   - Production: your Vercel deploy URL

## Safari (macOS)

1. Open Xcode → File → New → Target → Safari Web Extension
2. Choose "Convert Existing Extension"
3. Select the `browser-extension/` folder
4. Build and run — enable the extension in Safari → Settings → Extensions

## File Structure

```
browser-extension/
├── manifest.json        # MV3 manifest (Chrome/Edge/Brave)
├── popup.html/css/js    # Extension popup UI
├── background.js        # Service worker + context menu
├── options.html/css/js  # Settings page
├── icons/               # PNG icons (generated)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── scripts/
    └── generate-icons.js  # Icon generator (pure Node.js)
```

## How board sync works

When you click the extension icon, `popup.js` queries all open tabs for one running on your configured TravelPanel URL. If found, it injects a script (via `chrome.scripting.executeScript`) that reads from IndexedDB (`'travel-panel'`, `boards` store) and returns the board list. The result is cached in `chrome.storage.local` for 60 minutes.

If no TravelPanel tab is open, the cached boards are shown. Open TravelPanel in any tab to refresh.
