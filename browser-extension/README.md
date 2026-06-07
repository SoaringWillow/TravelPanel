# TravelPanel Clipper — Browser Extension

Clip any travel page (Instagram, YouTube, Xiaohongshu, TikTok, …) into your TravelPanel boards with one click.

## Features

- **One-click clipping** from the toolbar popup
- **Right-click context menu** — clip the current page or any link
- **Board selection** — choose from recent boards or type a new one
- **Platform detection** — automatically labels Instagram, YouTube, Xiaohongshu, TikTok, etc.
- **Configurable app URL** — works with any TravelPanel deployment

## Install (Chrome / Edge / Brave)

1. Generate the icon files (one-time):
   ```bash
   node icons/create-icons.js
   ```

2. Open `chrome://extensions` (or `edge://extensions`)

3. Enable **Developer mode** (toggle in the top-right)

4. Click **Load unpacked** and select this `browser-extension/` directory

5. The TravelPanel map-pin icon appears in your toolbar

## Install (Safari)

Safari requires wrapping the extension in an Xcode project using the Safari Web Extension converter:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari → Settings → Extensions.

## Usage

### Popup
Click the toolbar icon while on any travel page → choose a board → **Clip to TravelPanel**.

The TravelPanel share page opens in a new tab with the URL and title pre-filled. If you selected a named board in the extension, that board is pre-highlighted in the share page for one-tap confirmation.

### Right-click menu
Right-click any page or link → **Clip to TravelPanel** (page) / **Clip link to TravelPanel** (link).

### Settings
Click **Settings** in the popup footer to configure your TravelPanel deployment URL (defaults to `https://travelpanel.vercel.app`).

## Development

The extension uses Manifest V3 with no external dependencies. All files are vanilla JS/HTML/CSS.

| File | Purpose |
|---|---|
| `manifest.json` | Extension metadata and permissions |
| `popup.html` / `popup.js` / `styles.css` | Toolbar popup UI |
| `background.js` | Service worker — context menu wiring |
| `icons/create-icons.js` | Node.js script to generate icon PNGs |

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title when the popup is opened |
| `storage` | Persist recent board names and the app URL setting |
| `contextMenus` | Right-click "Clip to TravelPanel" on pages and links |
