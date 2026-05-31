# TravelPanel Clipper — Browser Extension

Clip any travel URL to your TravelPanel boards directly from Chrome, Edge, Brave, Arc, or Firefox.

## What it does

- **One-click clip** — Click the toolbar icon on any Instagram reel, YouTube video, Xiaohongshu post, or web page.
- **Right-click** — Right-click any link → "Save link to TravelPanel ✈"
- **Keyboard shortcut** — `Cmd+Shift+T` (Mac) / `Alt+Shift+T` (Windows/Linux)
- **Platform detection** — Recognises Instagram, YouTube, 小红书, Douyin, TikTok, Bilibili, Twitter/X, Google Maps, TripAdvisor, Airbnb, Booking.com
- **Connects to your app** — Opens TravelPanel's share flow so you pick the board; Claude extracts locations *and* wisdom from the post.

## Install (Chrome / Edge / Brave / Arc)

1. **Generate PNG icons** (first time only):
   ```bash
   cd browser-extension
   npm install sharp   # dev dependency, not shipped
   node scripts/generate-icons.js
   ```

2. Open `chrome://extensions` (or `edge://extensions`)

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** → select the `browser-extension/` folder

5. Pin the TravelPanel ✈ icon to your toolbar

## Install (Firefox)

Firefox supports SVG icons natively — no PNG generation needed.

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `browser-extension/manifest.json`

For permanent install, package and sign via [addons.mozilla.org](https://addons.mozilla.org).

## Configuration

Click the ⚙ gear icon in the popup (or right-click the toolbar icon → Options) to set:

| Setting | Default | Description |
|---|---|---|
| App URL | `https://travelpanel.vercel.app` | Your TravelPanel deployment URL |

If you self-host TravelPanel (e.g. on Vercel or Railway), paste your deployment URL here.

## How clipping works

1. Click the icon (or keyboard shortcut) while viewing a travel post
2. The extension opens `<your-app>/share?url=...&title=...` in a new tab
3. You select a board (or Inbox) in the share flow
4. Claude extracts **locations** (GPS pins) AND **wisdom** (tips, warnings, opinions)
5. The clip appears in your board with both layers

## File structure

```
browser-extension/
  manifest.json       — MV3 extension manifest
  popup.html          — Toolbar popup UI
  popup.js            — Popup logic (tab detection, platform badges)
  background.js       — Service worker (context menu, keyboard shortcut)
  options.html        — Settings page
  options.js          — Settings load/save
  icons/
    icon.svg          — Source SVG (map pin, gradient)
    icon16.png        — Generated PNGs (run generate-icons.js)
    icon32.png
    icon48.png
    icon128.png
  scripts/
    generate-icons.js — Converts SVG → PNG via sharp
```

## Supported platforms

| Platform | Detected as |
|---|---|
| instagram.com | Instagram 📸 |
| youtube.com, youtu.be | YouTube ▶️ |
| xiaohongshu.com, xhslink.com | 小红书 📕 |
| douyin.com | Douyin 🎵 |
| tiktok.com | TikTok 🎵 |
| bilibili.com | Bilibili 📺 |
| weibo.com | Weibo 🔴 |
| x.com, twitter.com | X / Twitter 🐦 |
| maps.google.com | Google Maps 🗺️ |
| tripadvisor.com | TripAdvisor 🦉 |
| airbnb.com | Airbnb 🏠 |
| booking.com | Booking.com 🏨 |
| everything else | 🌐 Web page |
