# TravelPanel Clipper — Browser Extension

A Chrome / Chromium extension that clips any travel post to your TravelPanel boards in one click.

## Features

- **One-click clipping** — popup shows current page title, URL, and detected platform (Instagram, YouTube, 小红书, TikTok, Bilibili)
- **Right-click context menu** — clip any link on the page without opening it first
- **Board-aware** — opens TravelPanel's full share flow so you can pick the board
- **Configurable URL** — works with any TravelPanel deployment (Vercel, local dev, self-hosted)

## Install (Chrome / Edge / Brave)

1. **Clone or download** this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `browser-extension/` folder.
5. The TravelPanel icon (✈️ map pin) appears in your toolbar.
6. Click the icon → **Configure URL** → enter your TravelPanel app URL → **Save**.

## Configure

Enter your TravelPanel URL in the settings page:

| Scenario | URL |
|---|---|
| Vercel deployment | `https://your-app.vercel.app` |
| Local dev | `http://localhost:3000` |
| Local network (for iOS testing) | `http://192.168.1.100:3000` |

## Usage

### Popup

1. Visit any travel post (Instagram, YouTube, 小红书, etc.)
2. Click the TravelPanel extension icon
3. Click **Clip to TravelPanel**
4. TravelPanel opens in a new tab at the share page with the URL pre-filled
5. Pick a board and clip

### Right-click menu

- Right-click any link → **📌 Clip link to TravelPanel** (clips the link target, not the current page)
- Right-click on the page background → **📌 Clip this page to TravelPanel**

## Regenerate Icons

The PNG icons in `icons/` are generated from a Python script. To regenerate:

```bash
python3 generate-icons.py
```

Requires only Python 3 standard library — no extra packages.

## How it Works

The extension opens TravelPanel's `/share?url=<encoded-url>&title=<title>` page, which triggers the existing share flow:

1. Claude extracts locations + substance (tips, warnings, wisdom) from the URL
2. User picks a destination board
3. Clip is saved to the board with full enrichment

No API keys or auth is stored in the extension — everything is handled by TravelPanel's existing backend.

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 88+ | ✅ Full support |
| Edge 88+ | ✅ Full support |
| Brave | ✅ Full support |
| Firefox | ⚠️ Requires [Firefox port](https://extensionworkshop.com/documentation/develop/porting-a-google-chrome-extension/) — `browser_specific_settings` key needed in manifest |
| Safari | ⚠️ Requires Xcode conversion via `xcrun safari-web-extension-converter` |
