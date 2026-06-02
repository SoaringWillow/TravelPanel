# TravelPanel Clipper — Browser Extension

A Chrome / Edge / Safari extension that clips any travel page URL into TravelPanel with one click.

## Features

- One-click clip from any page (Instagram, YouTube, Xiaohongshu, blogs, etc.)
- Platform auto-detection with branded badge
- Shows extracted locations inline in the popup
- Configurable TravelPanel URL (Settings page)
- Works with any self-hosted or Vercel-deployed TravelPanel instance

## Install (Developer Mode)

### Chrome / Edge
1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

### Safari
1. Open **Safari → Settings → Advanced** → enable "Show features for web developers"
2. Run: `xcrun safari-web-extension-converter browser-extension/ --app-name "TravelPanel Clipper"`
3. Open the generated Xcode project and run it — this installs the extension

## Configuration

Click the ⚙ Settings link in the popup to set your TravelPanel app URL:
- Default: `https://travelpanel.vercel.app`
- For local dev: `http://localhost:3000`

## How It Works

1. Click the extension icon on any travel page
2. Click **Clip to TravelPanel** — the extension calls `POST /api/import` with the current URL
3. TravelPanel's AI extracts locations and substance (tips, warnings, opinions) from the page
4. A new tab opens to `/share?url=...` so the clip is saved to your boards
5. The popup shows how many locations and insights were found

## Generate Icons (optional, for customization)

```bash
cd browser-extension
npm install canvas
node generate-icons.js
```

This regenerates `icons/icon{16,32,48,128}.png` with the TravelPanel gradient logo.
