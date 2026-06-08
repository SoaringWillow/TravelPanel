# TravelPanel Clipper — Browser Extension

Save travel inspiration from any website to your TravelPanel boards with one click.

## Features

- **One-click save** — clips the current page URL and title into TravelPanel's share flow
- **Right-click menu** — "Save page" and "Save link" context menu items on any page
- **Platform detection** — auto-labels Instagram, YouTube, TikTok, Xiaohongshu, Pinterest, and more
- **Zero friction** — opens TravelPanel's share screen with URL pre-filled; you pick the board

## Installation

### Chrome (and Chromium-based browsers)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Click the extension icon → enter your TravelPanel URL in settings

### Safari (macOS/iOS)

1. Open **Xcode → File → New → Target → Safari Web Extension**
2. In the Xcode dialog, choose **Convert Existing Extension** and point it at this folder
3. Follow the prompts to generate an Xcode project
4. Build and run; enable in **Safari → Settings → Extensions**

> Safari web extensions require a native Xcode wrapper. The Chrome extension source is fully compatible — Xcode's conversion tool does the wrapping automatically.

## Configuration

First-time setup:
1. Click the extension icon in your browser toolbar
2. If not configured, click **Configure URL**
3. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
4. Click **Save**

To change the URL later: click the ⚙️ gear icon in the popup.

## How It Works

When you click **Save to TravelPanel**, the extension opens a new tab at:

```
[your-travelpanel-url]/share?url=[current-page-url]&title=[page-title]
```

TravelPanel's share page handles board selection and AI extraction — the same flow as the iOS Share Extension.

## Development

No build step required. The extension is plain HTML + CSS + JS (Manifest V3).

To regenerate icons:
```bash
python3 browser-extension/generate-icons.py
```
