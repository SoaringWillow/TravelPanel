# TravelPanel Clipper — Browser Extension

Clip any travel post, video, or web page to your TravelPanel boards with one click.  
Extracts **spots** (locations + coordinates) **and** substance (tips, warnings, wisdom) — not just pins.

## Supported platforms

| Platform | Substance extraction |
|---|---|
| Instagram | ✓ |
| YouTube | ✓ |
| TikTok / Douyin | ✓ |
| 小红书 (Xiaohongshu) | ✓ |
| Bilibili | ✓ |
| Any URL | ✓ (best-effort) |

## Install — Chrome / Edge

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `browser-extension/` folder
4. Pin the TravelPanel icon to your toolbar

## Install — Safari (macOS)

Requires Xcode 14+:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Open the generated Xcode project, build it (⌘B), then enable the extension in  
**Safari → Settings → Extensions**.

## Configure the app URL

Click the gear icon in the popup (or right-click the toolbar icon → **Options**) to set your TravelPanel deployment URL.

Default: `https://travelpanel.vercel.app`  
Local dev: `http://localhost:3000`

## How it works

1. Click the extension icon on any page
2. The popup shows the current page's title, URL, and detected platform
3. Click **Clip to TravelPanel** — the app opens with `?import=<url>`
4. TravelPanel's AI extracts locations + substance and adds the clip to your Inbox

The extension also adds a **right-click → Clip to TravelPanel** context menu that works on any page or link.

## Generate icons (one-time dev setup)

```bash
node generate-icons.js
```

No dependencies — uses only Node.js built-ins.
