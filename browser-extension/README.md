# TravelPanel Clipper — Browser Extension

Save travel inspiration from any webpage to TravelPanel with one click.

## Features

- **One-click clipping** — click the 📍 toolbar icon on any page to save it
- **Right-click context menu** — right-click any page or link → "Save to TravelPanel"
- **Opens the full Share UI** — picks up the existing `/share?url=...` flow so Claude extracts locations + wisdom automatically
- **Configurable URL** — works with your own Vercel deployment, self-hosted instance, or local dev server
- **Platform detection** — badges Instagram, YouTube, Xiaohongshu, Douyin, etc.

## Installation (Chrome / Edge / Brave)

1. Clone or download this repo
2. Open `chrome://extensions` in your browser
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** → select the `browser-extension/` folder
5. The 📍 icon appears in your toolbar
6. Click it → **Settings** → paste your TravelPanel URL → **Save**

## Installation (Safari — macOS)

Safari requires converting the extension to a Safari Web Extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build and run the app once, enable the extension in **Safari → Settings → Extensions**.

## Setup

1. Open extension settings (⚙ Settings in the popup, or `chrome://extensions` → Details → Extension options)
2. Enter your TravelPanel URL, e.g. `https://your-app.vercel.app`
3. Click **Test connection** to verify, then **Save**

For local development: use `http://localhost:3000`

## Generating Icons (optional — pre-built icons included)

```bash
cd browser-extension
python3 create-icons.py
```

Requires only Python 3 stdlib (no external dependencies).

To regenerate with Node.js canvas (higher quality):
```bash
npm install canvas
node generate-icons.js
```
