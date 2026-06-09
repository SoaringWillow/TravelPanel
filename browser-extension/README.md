# TravelPanel Clipper — Browser Extension

Save travel inspiration from any webpage to your TravelPanel boards with one click.

## Features

- **One-click save** — Click the toolbar icon to save the current page
- **Context menu** — Right-click any link → "Save link to TravelPanel"
- **Platform detection** — Recognises WeChat, Xiaohongshu, Douyin/TikTok, Bilibili, Instagram, YouTube
- **Configurable URL** — Works with any TravelPanel deployment (Vercel, local, self-hosted)

## Install (Developer / Unpacked)

### Chrome / Edge / Brave

1. Regenerate icons if needed: `node generate-icons.js`
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select this `browser-extension/` folder
5. The TravelPanel pin icon appears in the toolbar

### Safari (macOS)

Safari requires converting the extension with Xcode. See Apple's
[Converting a web extension for Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari) guide.

## Configuration

Click the gear icon (⚙) in the popup to set your TravelPanel URL:

- **Default**: `https://travelpanel.vercel.app`
- **Local dev**: `http://localhost:3000`
- **Custom**: any deployed URL

## How it works

When you click **Save to TravelPanel**, the extension opens a new tab pointing to:

```
{appUrl}/share?url={currentUrl}&title={pageTitle}
```

TravelPanel's `/share` page handles extraction and board selection — the same flow as the iOS Share Extension.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Manifest V3) |
| `popup.html/css/js` | Toolbar popup UI |
| `background.js` | Service worker — context menus, message handler |
| `icons/` | PNG icons (16, 48, 128 px) |
| `generate-icons.js` | Regenerate icons from scratch (no deps) |

## Publishing to Chrome Web Store

1. Run `node generate-icons.js` to ensure PNGs are present
2. Zip the `browser-extension/` folder (excluding `generate-icons.js` and `README.md`)
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
