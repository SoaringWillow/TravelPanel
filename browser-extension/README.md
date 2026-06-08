# TravelPanel Clipper — Browser Extension

Clip any travel URL from Chrome or Safari directly into your TravelPanel boards.

## Features

- One-click clipping from the toolbar popup
- Right-click context menu ("Save to TravelPanel") on any page or link
- Board selector in the popup (synced from your live TravelPanel session)
- Quick note field
- Configurable TravelPanel URL (localhost for dev, Vercel URL for production)

## Install (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `browser-extension/` folder
4. Click the TravelPanel pin icon in your toolbar

## Install (Safari)

Convert to a Safari Web Extension with Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name TravelPanelClipper \
  --bundle-identifier com.travelpanel.clipper
```

Open the generated Xcode project, build it, then enable the extension in
**Safari → Settings → Extensions**.

## Configuration

Click the gear icon in the popup (or visit the extension's Options page) to set:

| Setting | Default | Description |
|---|---|---|
| TravelPanel URL | `http://localhost:3000` | Your running TravelPanel instance |
| Open after clipping | off | Open the app tab after saving |
| Close popup after clipping | on | Auto-close popup on save |

For production set the URL to your Vercel deployment, e.g. `https://your-app.vercel.app`.

## How it works

1. Clicking **Clip to TravelPanel** opens `/share?url=<url>&title=<title>` in a new tab.
2. The share page runs the same Claude extraction pipeline as the iOS Share Extension.
3. The content script (`content.js`) mirrors your boards from IndexedDB into
   `chrome.storage.local` so the popup can show board chips without an extra API call.
