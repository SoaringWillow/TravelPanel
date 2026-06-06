# TravelPanel Browser Extension

A Chrome/Edge/Brave extension (Manifest V3) that lets you clip any travel page into TravelPanel with one click.

## What it does

- Detects the platform (Instagram, YouTube, TikTok, Xiaohongshu, Pinterest, etc.)
- Shows the current page title and URL in a clean popup
- Opens your TravelPanel `/share` page to extract locations + wisdom via Claude AI

## Supported platforms

Instagram · YouTube · TikTok / Douyin · Xiaohongshu · Bilibili · WeChat · X / Twitter · Pinterest · TripAdvisor · Booking.com · Airbnb · Reddit · Any web page

## Installation (Developer Mode)

1. **Generate icons** (one-time setup):
   ```bash
   node generate-icons.js
   ```

2. Open Chrome → `chrome://extensions/`

3. Enable **Developer mode** (top right toggle)

4. Click **Load unpacked** → select this `browser-extension/` folder

5. Click the TravelPanel icon in the toolbar → **Configure App URL**

6. Enter your deployed Vercel URL (e.g. `https://travel-panel-abc.vercel.app`) and save

## Files

```
manifest.json       Chrome Manifest V3
popup.html/.js      Extension toolbar popup
options.html/.js    Settings page (app URL config)
icons/              16×48×128px PNG icons
generate-icons.js   Script to regenerate icons
```

## Publishing to Chrome Web Store

1. Zip the entire `browser-extension/` folder
2. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Fill in store listing, screenshots, privacy policy
4. Submit for review (~3–7 days)

## Safari (iOS/macOS)

Use Xcode's **Convert Web Extension** tool:
1. File → New → Project → Safari Web Extension
2. Choose "Convert existing extension"
3. Select this folder
4. Build and run on device

## Development

The extension requires no build step — plain HTML/JS. Edit files and reload the extension in `chrome://extensions/` to see changes.
