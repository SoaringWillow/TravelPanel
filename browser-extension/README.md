# TravelPanel Browser Extension

Clip travel inspiration from any webpage — AI extracts both **spots** (pins) AND **substance** (tips, warnings, wisdom) directly into TravelPanel.

## What it does

1. Navigate to any travel page (Instagram, YouTube, blog, Xiaohongshu, etc.)
2. Click the 📍 TravelPanel icon in your browser toolbar
3. The extension calls the TravelPanel AI extraction API and shows a preview:
   - Number of geographic spots found
   - Number of tips/warnings/wisdom items extracted
   - A preview of the substance layer
4. Click **Save to TravelPanel** → the page opens in TravelPanel's capture flow where you add it to a board

## Installation

### Chrome / Edge / Brave

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The 📍 icon appears in your toolbar (pin it for easy access)

### Safari (macOS)

Safari requires the extension to be converted via Xcode:

```bash
# Install Xcode command-line tools if needed
xcode-select --install

# Convert the extension
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari Preferences → Extensions.

## Configuration

After installation, click the ⚙️ gear icon in the popup (or right-click the extension → Options) to set your TravelPanel server URL:

- **Vercel deployment**: `https://your-app.vercel.app`
- **Local development**: `http://localhost:3000`

Use the **Test Connection** button to verify the extension can reach your TravelPanel API.

## Architecture

| File | Purpose |
|---|---|
| `manifest.json` | MV3 extension config |
| `popup.html/js` | Extension popup UI + interaction |
| `background.js` | Service worker — makes API calls (no CORS restriction) |
| `options.html/js` | Settings page |
| `icons/` | SVG icons for all sizes |

The extension sends the current page URL to `POST /api/import` on your TravelPanel server. The background service worker caches results for 5 minutes to avoid duplicate API calls.

## Permissions used

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `storage` | Save TravelPanel server URL setting |
| `tabs` | Open TravelPanel in a new tab after clipping |
| `host_permissions: *` | Call your TravelPanel API (any domain) |
