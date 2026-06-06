# TravelPanel Clipper — Browser Extension

A Manifest V3 Chrome/Edge extension that lets you save travel inspiration from any page directly into TravelPanel with a single click.

## What it does

- **Popup**: Click the extension icon to see the current page's URL and title. Hit **Save to TravelPanel** to open a focused pop-up window on the `/share` board picker, exactly like the iOS Share Extension.
- **Context menu**: Right-click any page or link → *Save page/link to TravelPanel*.
- **Settings**: Configure the app URL (needed when self-hosting or running locally).
- **Platform detection**: Automatically identifies YouTube, Instagram, TikTok, Xiaohongshu, Douyin, bilibili, and more — shown as a coloured badge.
- **OG metadata**: Extracts title and thumbnail from Open Graph tags for a rich preview.

## Install (Chrome / Edge)

1. Open **chrome://extensions** (or **edge://extensions**).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `browser-extension/` folder.
4. The pin icon appears in your toolbar. Pin it for quick access.

## Configure

Open the extension's **Settings** (gear icon in the popup, or right-click → *Options*) and set:

| Setting | Default | Notes |
|---------|---------|-------|
| **App URL** | `https://travelpanel.vercel.app` | Change to `http://localhost:3000` for local dev |

## Safari (macOS / iOS)

Safari requires converting a Chrome extension to a Safari Web Extension using Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable the extension in Safari settings.

## Files

```
browser-extension/
  manifest.json   — MV3 extension manifest
  popup.html/css/js — Extension popup UI
  background.js   — Service worker: dynamic icon + context menu
  options.html/js — Settings page (app URL)
  README.md
```

## Privacy

The extension only reads the active tab's URL and Open Graph metadata when you interact with it. No data is sent to any third-party server — the clip is sent to **your** TravelPanel app only.

## Publishing to Chrome Web Store

1. Zip the `browser-extension/` folder.
2. Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Upload the zip and fill in the store listing.
4. Add screenshots showing the popup and the share flow.
