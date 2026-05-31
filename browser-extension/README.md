# TravelPanel Clipper — Browser Extension

Clip any travel URL into TravelPanel directly from Chrome or any Chromium-based browser (Edge, Brave, Arc). Safari support via "Allow unsigned extensions" mode.

## Features

- **Toolbar button** — click to clip the current page
- **Right-click context menu** — clip any page or link without opening it
- **Platform detection** — recognises Xiaohongshu, WeChat, Douyin, Instagram, YouTube, and more
- **Board picker** — the TravelPanel Share Sheet opens so you can pick which board to save to
- **Configurable URL** — works with local dev (`localhost:3000`) or your Vercel deployment

## Installation (Chrome / Edge / Brave / Arc)

1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repository
5. The ✈️ TravelPanel icon appears in your toolbar

> **Pin it**: Click the puzzle-piece icon → find TravelPanel Clipper → click the pin icon so it's always visible.

## Configuration

1. Click the ✈️ toolbar icon → click ⚙️ (Settings)
2. Enter your TravelPanel URL:
   - **Local dev**: `http://localhost:3000`
   - **Production**: `https://your-app.vercel.app`
3. Click **Save**

## Usage

### Clip the current page
1. Navigate to any travel page (Instagram post, YouTube video, travel blog)
2. Click the ✈️ toolbar icon
3. Click **Clip to TravelPanel**
4. A share window opens — pick a board and confirm

### Right-click clip
- **Right-click anywhere on the page** → "✈️ Clip this page to TravelPanel"
- **Right-click a link** → "✈️ Clip this link to TravelPanel" (saves the link URL, not the current page)

## Safari (macOS)

1. Open Safari → Settings → Advanced → ✅ Show Develop menu
2. Develop menu → Allow Unsigned Extensions
3. Drag the `browser-extension/` folder into Safari Extensions (or use `xcrun safari-web-extension-converter`)

> Safari requires signing for production distribution. For personal use, the unsigned mode works fine.

## Development / Customization

The extension is plain JavaScript — no build step required.

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | Service worker: context menus, icon, share window |
| `popup.html/js/css` | Toolbar popup UI |
| `options.html/js/css` | Settings page |
