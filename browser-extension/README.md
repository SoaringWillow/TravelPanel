# TravelPanel Clipper — Browser Extension

A Chrome/Safari (MV3) browser extension that clips any travel page directly into your TravelPanel boards. One click opens the `/share` flow with the URL and title pre-filled; Claude AI handles the extraction.

## Files

```
browser-extension/
  manifest.json        Chrome MV3 manifest
  popup.html/js        Toolbar popup UI
  options.html/js      Settings page (configure app URL)
  generate-icons.js    Run once to regenerate PNG icons
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
```

## Setup (Chrome / Edge / Brave)

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select this `browser-extension/` folder
3. Click the extension icon → a setup prompt appears → click **Open Settings**
4. Paste your TravelPanel deployment URL (e.g. `https://your-app.vercel.app`) and click **Save**

## Setup (Safari — macOS 14+)

Safari requires converting the extension via Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location ~/Desktop \
  --app-name TravelPanelClipper
```

Open the generated Xcode project, build & run, then enable the extension in **Safari → Preferences → Extensions**.

## Usage

1. Navigate to any travel blog, Instagram post, YouTube video, or Xiaohongshu page
2. Click the ✈️ icon in the toolbar
3. Click **Save to TravelPanel** — a new tab opens at `/share` with the URL pre-filled
4. Pick a board; Claude extracts locations and wisdom in the background

## Regenerating icons

```bash
node generate-icons.js
```
