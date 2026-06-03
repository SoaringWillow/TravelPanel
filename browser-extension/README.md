# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any web page (YouTube, Instagram, travel blogs) directly into your TravelPanel boards.

## Features

- **One-click clipping** — click the toolbar icon to clip the current page
- **Right-click clipping** — context menu on any page or link
- **Platform detection** — auto-detects Instagram, YouTube, 小红书, Douyin/TikTok, Bilibili, Pinterest, Twitter/X
- **Configurable app URL** — works with any TravelPanel deployment (Vercel, localhost, etc.)

## Installation (Chrome / Edge / Brave)

1. **Generate icons** (one-time setup):
   ```bash
   node icons/generate.js
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (toggle in the top-right)

4. Click **Load unpacked** and select this `browser-extension/` folder

5. The TravelPanel ✈️ icon appears in your toolbar

6. Click the icon and enter your TravelPanel app URL (e.g. `https://your-app.vercel.app`) to finish setup

## Installation (Safari)

Safari requires converting to the Safari Web Extension format first:

```bash
# Requires Xcode
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then build and run the generated Xcode project. Enable the extension in Safari → Settings → Extensions.

## Development (localhost)

When running TravelPanel locally (`npm run dev`), set the app URL to `http://localhost:3000` in the extension settings.

## How It Works

1. Clicking the toolbar icon opens a popup showing the current page title and URL
2. Clicking **Clip to TravelPanel** opens a new tab at `/share?url=...&title=...` in your app
3. The TravelPanel share page lets you pick a board and saves the clip with AI enrichment

## Regenerating Icons

If you want custom icons, edit the color values in `icons/generate.js` and re-run:
```bash
node icons/generate.js
```

Current icon color: indigo-600 (`#4f46e5`).
