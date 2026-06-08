# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any web page directly into your TravelPanel boards.

## Features

- **One-click clipping** — click the toolbar icon on any page
- **Right-click to clip** — context menu on any link or page
- **Platform detection** — recognises YouTube, Instagram, Xiaohongshu, TikTok, Bilibili, WeChat
- **Page preview** — shows thumbnail and title before you clip
- **Configurable URL** — point to your own TravelPanel deployment

On clip, the extension opens TravelPanel's Share page pre-filled with the URL.
TravelPanel then uses Claude AI to extract locations and wisdom from the page.

---

## Installation (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

The TravelPanel icon appears in your toolbar. Pin it for quick access.

---

## Configuration

Click the extension icon → gear ⚙️ → set your **TravelPanel URL**.

Default: `https://travel-panel.vercel.app`

Change this if you've deployed TravelPanel to a custom domain.

---

## Safari (Web Extensions)

Use Xcode's `safari-web-extension-converter` to convert the extension:

```bash
xcrun safari-web-extension-converter /path/to/extension --project-location ~/Desktop
```

Then open the generated Xcode project, build, and enable in Safari → Settings → Extensions.

---

## File Structure

```
extension/
  manifest.json     — Extension config (Manifest V3)
  popup.html/css/js — Toolbar popup UI
  background.js     — Service worker (context menu)
  content.js        — Content script placeholder
  options.html/js   — Settings page
  icons/            — PNG icons (16, 32, 48, 128px)
```
