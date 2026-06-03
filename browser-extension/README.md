# TravelPanel Clipper — Browser Extension

One-click URL clipper for Chrome, Edge, Brave, and Safari (via Web Extension converter).

## What it does

Click the toolbar icon on any travel page (Instagram, YouTube, Xiaohongshu, travel blogs…) and it opens your TravelPanel `/share` page pre-filled with the URL and page title. Claude extracts spots and substance; you pick a board and save.

## Install in Chrome / Edge / Brave

1. Open **chrome://extensions** (or **edge://extensions**)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The ✈️ icon appears in your toolbar — pin it for easy access

## Configure the TravelPanel URL

By default the extension points to `https://travelpanel.vercel.app`.

To change it (e.g. for local dev):
1. Right-click the extension icon → **Options**
2. Enter your URL (e.g. `http://localhost:3000`)
3. Save

## Install in Safari (macOS / iOS)

Safari requires Apple's native Web Extension format. Convert this extension once using Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop/TravelPanelSafariExt \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build, and enable the extension in
Safari → Settings → Extensions.

## Regenerate icons

Icons are pre-generated PNGs. To regenerate (e.g. after changing the design):

```bash
node generate-icons.mjs
```

## File map

```
manifest.json        — MV3 extension manifest
popup.html/js        — Toolbar popup UI and logic
options.html/js      — Settings page (configure app URL)
icons/               — 16/48/128px PNG toolbar icons
generate-icons.mjs   — Icon generator (no external deps)
```
