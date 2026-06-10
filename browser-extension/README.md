# TravelPanel Clipper — Browser Extension

Clip travel content from any web page directly into your TravelPanel boards with one click.

## Features

- **One-click clipping** — toolbar button opens TravelPanel with the current page pre-filled for import
- **Context menu** — right-click any page or link → "Clip to TravelPanel"
- **Platform detection** — recognises 小红书, 抖音, Bilibili, Instagram, YouTube, TikTok, and more
- **Recent clips** — history of your last 10 clips with quick re-open buttons
- **Configurable URL** — point the extension at your own TravelPanel instance

## Setup (Chrome / Chromium)

1. **Generate icons** (one-time, requires Node.js):
   ```bash
   cd browser-extension
   node generate-icons.js
   ```

2. **Load the extension**:
   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `browser-extension/` folder

3. **Configure your TravelPanel URL** (if self-hosted):
   - Click the extension icon in the toolbar
   - Click the ⚙ settings icon
   - Enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
   - Click **Save**

## Setup (Safari / macOS)

1. Follow the steps above to generate icons and verify the extension loads in Chrome.
2. Convert to a Safari extension using Xcode:
   ```bash
   xcrun safari-web-extension-converter browser-extension/ \
     --project-location . \
     --app-name TravelPanelClipper \
     --bundle-identifier com.yourname.travelpanel.clipper
   ```
3. Open the generated Xcode project, build, and enable in **Safari → Preferences → Extensions**.

## How it works

1. Click the extension icon on any travel page (Instagram post, YouTube video, 小红书 article, etc.)
2. Review the page title and detected platform in the popup
3. Click **Clip to TravelPanel** — a new tab opens with TravelPanel's import sheet pre-filled
4. TravelPanel's AI extracts locations, tips, warnings, and wisdom from the page
5. Confirm to save the clip to your board

For links you find while browsing, right-click → **Clip this link to TravelPanel** — no need to navigate to the page first.

## Files

```
browser-extension/
├── manifest.json        — Chrome Manifest V3
├── popup.html           — Extension popup UI
├── popup.css            — Popup styles
├── popup.js             — Popup logic (platform detection, recent clips, settings)
├── background.js        — Service worker (context menus)
├── generate-icons.js    — Script to generate icon PNGs (run once)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `storage` | Save your TravelPanel URL and recent clips history |
| `contextMenus` | Add the right-click "Clip this…" menu items |
| `host_permissions: <all_urls>` | Allow opening TravelPanel tabs for any clipped URL |
