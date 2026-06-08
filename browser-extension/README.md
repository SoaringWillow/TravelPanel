# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any webpage (Instagram, YouTube, TikTok, 小红书, Pinterest, or any URL) directly into your TravelPanel boards — in one click.

## Install (Chrome / Edge / Brave)

1. **Generate icons** (first time only):
   ```sh
   node generate-icons.js
   ```

2. Open `chrome://extensions` in your browser.

3. Enable **Developer mode** (top-right toggle).

4. Click **Load unpacked** and select this `browser-extension/` folder.

5. The TravelPanel icon appears in your toolbar (pin it for easy access).

6. Click the icon → **Settings** → paste your TravelPanel URL (e.g. `https://your-app.vercel.app`) → Save.

## Install (Safari)

Use Apple's [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari):

```sh
xcrun safari-web-extension-converter browser-extension/ --project-location . --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

## How It Works

1. Navigate to any travel post (Instagram, YouTube, TikTok, 小红书, etc.)
2. Click the TravelPanel icon in the toolbar
3. The extension shows the page's platform, title, and URL
4. Click **Clip to TravelPanel** — the app opens at `/share?url=...&title=...`
5. Pick a board in the familiar share sheet — clip is saved and enriched in the background

The clip lands in TravelPanel's share flow, so board selection, AI extraction (spots + substance), and retry logic all work exactly as they do from the iOS Share Sheet.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 extension config |
| `popup.html` / `popup.js` | Toolbar popup — shows page info + clip button |
| `options.html` / `options.js` | Settings page — configure TravelPanel URL |
| `generate-icons.js` | Generates `icons/*.png` using Node built-ins |
| `icons/` | Generated PNG icons (16, 32, 48, 128 px) |

## Permissions

| Permission | Why |
|---|---|
| `tabs` | Read current tab URL and title |
| `activeTab` | Required to access the active tab |
| `storage` | Persist the TravelPanel app URL across sessions |
