# TravelPanel Browser Extension

Clip any travel inspiration URL into TravelPanel from your browser — Instagram reels, YouTube videos, blog posts, Xiaohongshu posts, and more. The extension opens TravelPanel with the URL pre-loaded, then Claude extracts locations and tips automatically.

## Features

- **One-click clip** — clip the current tab with a single click
- **Platform detection** — recognises Instagram, YouTube, TikTok, 小红书, WeChat, Bilibili, Douyin, Pinterest, TripAdvisor
- **Custom URL input** — paste any URL directly in the popup
- **Right-click menu** — right-click any link or page to clip it
- **Keyboard shortcut** — `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Win/Linux)
- **Configurable app URL** — point to your local dev server or production deployment

## Installation (Chrome / Edge / Brave)

1. Clone or download this repository
2. Generate the icons (one-time setup):
   ```bash
   cd browser-extension/icons
   python3 generate_icons.py
   ```
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (toggle in the top-right)
5. Click **Load unpacked**
6. Select the `browser-extension/` folder
7. The TravelPanel pin icon appears in your toolbar

## Installation (Safari on macOS)

1. Open Xcode → **File → New → Project → Safari Extension**
2. Copy the contents of `browser-extension/` into the new extension's `Resources/` folder
3. Build and run from Xcode to install into Safari

## Configuration

Click the ⚙️ settings icon in the popup to set the TravelPanel URL:

| Environment | URL |
|---|---|
| Local dev server | `http://localhost:3000` (default) |
| Production | `https://your-app.vercel.app` |

## Usage

1. Navigate to any travel content page (Instagram, YouTube, a blog, etc.)
2. Click the TravelPanel pin icon in the toolbar (or press `Cmd+Shift+S`)
3. Click **Clip to TravelPanel**
4. TravelPanel opens and Claude automatically extracts:
   - 📍 Locations with GPS coordinates
   - 💡 Tips, warnings, and travel wisdom
5. Review the preview, add personal notes, and save to your collection

## How it works

The extension opens TravelPanel with `?import=<url>` — TravelPanel's own import sheet handles the extraction and saving. No credentials are stored in the extension; all data lives in TravelPanel.
