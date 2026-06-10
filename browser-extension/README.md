# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any webpage to your TravelPanel boards with one click.

## Install (Developer Mode)

1. Clone or download this repository.
2. Open Chrome/Edge and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `browser-extension/` folder.
5. The TravelPanel pin icon appears in your toolbar.

### Safari (macOS / iOS)
Convert to a Safari Web Extension using Xcode:
```
xcrun safari-web-extension-converter /path/to/browser-extension --project-location ./safari-extension
```
Then build + install via Xcode.

## Setup

1. Click the extension icon → gear (⚙) → Settings.
2. Enter your TravelPanel app URL, e.g. `https://my-travelpanel.vercel.app`.
3. Click **Save Settings**.

## Usage

1. Browse any travel post (Instagram, YouTube, Xiaohongshu, Bilibili, WeChat, any site).
2. Click the TravelPanel icon in the toolbar.
3. Click **Clip to TravelPanel** — a new tab opens at the board-picker.
4. Choose a board (or Inbox) and save.  
   AI extracts locations + travel wisdom from the post in the background.

## Supported Platforms

| Platform | Detection |
|---|---|
| 小红书 Little Red Book | `xiaohongshu.com`, `xhslink.com`, `xhs.link` |
| WeChat | `weixin.qq.com`, `mp.weixin` |
| Bilibili | `bilibili.com`, `b23.tv` |
| Douyin / TikTok | `douyin.com`, `iesdouyin.com`, `tiktok.com` |
| Any website | everything else |

## Files

```
browser-extension/
├── manifest.json   — Chrome Manifest V3
├── popup.html/js   — Toolbar popup
├── options.html/js — Settings page
└── icons/
    └── icon.svg    — Extension icon
```

## Notes

- The extension only needs `activeTab` and `storage` permissions — it never reads page content itself.
- Clipping works by opening `<your-url>/share?url=<page-url>&title=<page-title>` in a new tab. The share page handles extraction and board assignment.
- Data is stored locally in IndexedDB inside the TravelPanel web app origin.
