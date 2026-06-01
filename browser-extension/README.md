# TravelPanel Clipper — Browser Extension

A Chrome/Edge browser extension that clips travel content from any web page into TravelPanel with one click. Uses the same AI extraction pipeline (locations + substance) as the iOS Share Sheet.

## Features

- **AI extraction** — calls your TravelPanel's `/api/import` endpoint to extract locations and travel wisdom
- **Preview before saving** — see extracted locations and tips before committing
- **Zero-friction save** — opens TravelPanel's share page with pre-filled data (no re-extraction needed)
- **Works on any page** — Instagram, YouTube, travel blogs, any URL

## Install (Chrome / Edge / Brave)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this `browser-extension/` folder
4. The TravelPanel pin icon appears in your toolbar

## Setup

1. Click the extension icon → click the gear ⚙ icon
2. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
3. Click **Save**

## Usage

1. Navigate to any travel-related page (Instagram post, YouTube video, travel blog)
2. Click the TravelPanel extension icon
3. Click **Extract & Clip** — the AI extracts locations and wisdom (~5–15 seconds)
4. Review the extracted content in the popup
5. Click **Save to TravelPanel →** — your app opens with the clip pre-loaded
6. Choose a board and save

## How it works

```
Browser popup → POST /api/import → AI extraction
             → Preview in popup
             → Open /share?url=...&ext=<extracted-data>
             → TravelPanel saves to IndexedDB (no re-extraction)
```

The `?ext=` parameter passes pre-extracted data to the share page so the clip saves instantly without a second API call.

## Safari

Safari supports WebExtensions (MV3) since Safari 16. To install:
1. Open this folder in Xcode via **File → New → Project → Safari Extension**
2. Or use `xcrun safari-web-extension-converter browser-extension/`
3. Build and run to install in Safari

## Development

No build step required. The extension is plain HTML/CSS/JS. Reload via the `chrome://extensions` refresh button after editing files.
