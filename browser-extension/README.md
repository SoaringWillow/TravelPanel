# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any webpage into TravelPanel with one click.
Works anywhere the iOS Share Sheet doesn't — travel blogs, YouTube, Instagram on desktop, and more.

## How it works

Clicking the extension opens a popup showing the current page. Hit **Clip to TravelPanel** and the
app's share page opens in a new tab, where you pick which board to save it to. The same
two-layer extraction (spots + substance) runs in the background.

## Installation

### Chrome / Edge / Brave (Manifest V3)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder in this repository
5. Click the puzzle-piece icon in the toolbar → pin TravelPanel Clipper

### Safari (macOS 14+ / iOS 17+)

Safari requires the extension to be packaged as a native app using Xcode:

1. Install Xcode 15+
2. Run: `xcrun safari-web-extension-converter browser-extension/ --app-name "TravelPanel Clipper"`
3. Open the generated Xcode project → Product → Run
4. In Safari: Settings → Extensions → enable TravelPanel Clipper

### Firefox (Manifest V2 note)

Firefox uses Manifest V2. The extension needs a small adaptation:
- Change `manifest_version` to `2`
- Replace `"action"` with `"browser_action"`
- Load via `about:debugging#/runtime/this-firefox` → Load Temporary Add-on

## First-time setup

On first click the extension shows a **Connect to TravelPanel** screen. Enter the URL of your
TravelPanel deployment (e.g. `https://your-app.vercel.app`) and hit **Connect**.
The URL is stored in sync storage and shared across your Chrome profile.

To change the URL later: right-click the extension icon → **Options**, or click
**⚙ Change TravelPanel URL** in the popup.

## File structure

```
browser-extension/
  manifest.json   — Chrome Manifest V3 config
  popup.html      — Popup UI (opens when you click the icon)
  popup.js        — Popup logic (platform detection, clip action)
  options.html    — Settings page (TravelPanel URL + stats)
  options.js      — Settings logic (save, test connection)
  icons/
    icon16.png    — Toolbar icon
    icon48.png    — Extension management page icon
    icon128.png   — Chrome Web Store / about page icon
```
