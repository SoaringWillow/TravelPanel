# TravelPanel Browser Extension

Clip travel content from any website directly into TravelPanel with one click.

## What it does

1. Click the TravelPanel icon in your browser toolbar while on any travel page
2. The popup shows the page title and URL
3. Click **Save to TravelPanel** — a new tab opens at the TravelPanel share page with the URL pre-filled
4. Pick your board and confirm — the clip is extracted and saved automatically

Supports social platforms with a colour-coded badge: Instagram, YouTube, TikTok, 小红书, 抖音, Bilibili, Twitter/X.

---

## Installation

### Step 1 — Generate PNG icons

Open `icons/generate-pngs.html` in your browser and click **Generate & Download All Icons**.
Move the four downloaded files (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) into this `icons/` folder.

### Step 2 — Load in Chrome / Edge / Brave

1. Navigate to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `browser-extension/` directory

The TravelPanel pin icon should now appear in your toolbar.

### Step 3 — Configure your app URL

Click the ⚙ gear icon in the popup, or right-click the extension icon → **Options**.

Set the **TravelPanel App URL**:

| Environment     | URL                                        |
|----------------|--------------------------------------------|
| Local dev      | `http://localhost:3000`                    |
| Production     | Your Vercel URL, e.g. `https://travel.vercel.app` |

Click **Save settings**.

---

## Firefox

This extension uses Manifest V3, supported in Firefox 109+.

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from this directory

> Note: temporary add-ons are removed on browser restart. For persistent install, sign the extension via [addons.mozilla.org](https://addons.mozilla.org/developers/).

## Safari (macOS)

Convert the extension using Apple's migration tool (requires Xcode):

```bash
xcrun safari-web-extension-converter /path/to/browser-extension --project-location ~/Desktop
```

Then open the generated Xcode project, build it, and enable it in Safari → Settings → Extensions.

---

## Project structure

```
browser-extension/
├── manifest.json        Manifest V3 config
├── popup.html/js/css    Toolbar popup UI
├── options.html/js      Settings page
└── icons/
    ├── icon.svg         Source SVG (128×128 design)
    ├── generate-pngs.html   Canvas-based PNG generator
    └── icon{16,32,48,128}.png   (generated — not tracked in git)
```

---

## Development

No build step required — the extension uses vanilla JS and loads directly from source files.

After editing any file, go to `chrome://extensions` and click the **↻ refresh** icon on the TravelPanel Clipper card.
