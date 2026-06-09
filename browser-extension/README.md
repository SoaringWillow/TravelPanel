# TravelPanel Clipper — Browser Extension

Save travel content from any webpage to your TravelPanel boards in one click.

## Features

- **Toolbar button** — click the pin icon on any page to clip it instantly
- **Right-click context menu** — "Save to TravelPanel" on any page or link
- **Platform detection** — recognises YouTube, Instagram, Xiaohongshu, Douyin, Bilibili, WeChat, TikTok
- **Board selector** — saves to Inbox by default (board selection coming in v1.1)

## Install in Chrome / Edge (Developer Mode)

1. **Build icons** (skip if `icons/icon*.png` already exist):
   ```bash
   node generate-icons.js
   ```

2. Open `chrome://extensions` (or `edge://extensions`)

3. Enable **Developer mode** (toggle, top-right)

4. Click **Load unpacked** → select this `browser-extension/` directory

5. The TravelPanel pin icon appears in the toolbar  
   (click the Extensions puzzle piece to pin it)

6. **First run**: click the icon, then **Configure URL** to set your TravelPanel URL  
   (e.g. `https://your-app.vercel.app` or `http://localhost:3000` for local dev)

## Install in Safari (macOS)

Safari requires converting the extension through Xcode:

```bash
# Requires Xcode 14+ and macOS 12+
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project and run it. Safari will prompt you to enable
the extension in **Safari → Settings → Extensions**.

## Configuration

Click the **gear icon** in the popup, or open **Extension Settings** to set:

| Setting | Example |
|---------|---------|
| TravelPanel URL | `https://your-app.vercel.app` |

## How It Works

1. You click "Clip to TravelPanel" in the popup
2. The extension opens a new tab to `<your-url>/share?url=<page-url>&title=<page-title>`
3. TravelPanel's share page saves the clip and triggers AI extraction (locations + wisdom)
4. The new tab auto-dismisses in ~3 seconds

The clip lands in IndexedDB (local) and syncs to the cloud when Supabase is configured.

## File Structure

```
browser-extension/
  manifest.json      # Manifest V3 (Chrome, Edge, Safari via Xcode)
  popup.html         # Toolbar popup UI
  popup.css          # Popup styles
  popup.js           # Popup logic
  background.js      # Service worker (context menu handler)
  options.html       # Settings page
  options.js         # Settings logic
  generate-icons.js  # Icon generation script (requires sharp/Inkscape/ImageMagick)
  icons/
    icon.svg         # Source SVG (master icon)
    icon16.png       # 16×16 toolbar icon
    icon32.png       # 32×32
    icon48.png       # 48×48
    icon128.png      # 128×128 (extension store listing)
```
