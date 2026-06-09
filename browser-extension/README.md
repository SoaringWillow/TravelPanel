# TravelPanel Clipper — Browser Extension

A Chrome/Edge/Brave extension that clips travel inspiration from any page directly into TravelPanel.

## What It Does

- One click from any travel page (Instagram, YouTube, Xiaohongshu, etc.)
- Opens TravelPanel's share flow with the URL pre-filled
- TravelPanel extracts locations, activities, and travel wisdom from the page
- Works with any TravelPanel deployment (local or Vercel)

## Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` directory
5. The ✈ icon appears in your toolbar

## First-Time Setup

1. Click the extension icon → click the settings gear ⚙
2. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
3. Click **Save Settings**

## How to Clip a Page

1. Browse to a travel page (Instagram reel, YouTube travel video, Xiaohongshu post, etc.)
2. Click the **✈ TravelPanel** extension icon
3. Click **Clip to TravelPanel**
4. A new tab opens with TravelPanel's Save flow
5. Select a board (or save to Inbox) — done

## Publishing to Chrome Web Store

1. Zip the contents of this directory (not the directory itself)
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create a new item, upload the zip
4. Fill in the store listing and submit for review

## Safari (iOS / macOS)

Convert to a Safari Web Extension using Xcode:
```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project and build for macOS/iOS.
