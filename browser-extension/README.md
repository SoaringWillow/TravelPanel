# TravelPanel Clipper — Browser Extension

Save any travel inspiration URL to TravelPanel with one click from Chrome, Edge, or Brave.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `browser-extension/` folder
4. The TravelPanel pin icon appears in your toolbar

## First-time setup

1. Click the extension icon
2. Open **Settings** (⚙️)
3. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
4. Click **Save**

## Usage

Navigate to any Instagram post, YouTube video, Xiaohongshu link, or any travel page, then click the extension icon → **Save to TravelPanel**.

The TravelPanel share page opens in a new tab where you can pick a board. Claude then extracts spots and substance from the page in the background.

## Regenerate icons (optional)

If you want to regenerate the PNG icons from the SVG source:

```bash
npm install   # installs sharp (dev dep)
node generate-icons.js
```

## Safari (macOS / iOS)

Use Xcode's **Safari Web Extension Converter** to convert this folder into a Safari extension:

```bash
xcrun safari-web-extension-converter browser-extension/
```

Then build and run from Xcode.
