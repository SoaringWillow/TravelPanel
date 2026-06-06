# TravelPanel Browser Extension

Clip any travel inspiration from the web into TravelPanel with one click. Works with Chrome, Edge, Brave, and Safari.

## Installation

### Chrome / Edge / Brave

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repository
5. The TravelPanel Clipper icon appears in your toolbar (pin it for easy access)

### Safari

Safari requires converting the extension via Xcode:

```bash
# From the repo root
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in **Safari → Settings → Extensions**.

## First-time Setup

1. Click the extension icon in your toolbar
2. Click the **⚙ gear** (settings) in the top-right
3. Enter your TravelPanel URL:
   - Production: `https://your-app.vercel.app`
   - Local dev: `http://localhost:3000`
4. Click **Save Settings**

## How It Works

1. Navigate to any travel inspiration page
2. Click the **TravelPanel Clipper** icon
3. Click **Clip to TravelPanel** — TravelPanel opens in a new tab
4. Pick a board (or save to Inbox)
5. TravelPanel's AI automatically extracts locations, tips, and wisdom from the page

## Supported Sites

All web pages are supported. AI extraction is optimised for:

| Platform | Badge |
|---|---|
| YouTube travel vlogs | YouTube |
| Instagram posts | Instagram |
| WeChat articles | 微信 WeChat |
| Xiaohongshu | 小红书 |
| Douyin / TikTok | Douyin / TikTok |
| Bilibili travel content | Bilibili |
| X / Twitter threads | X / Twitter |
| Any travel blog or website | Web |

## Permissions

| Permission | Why |
|---|---|
| `tabs` | Read the current tab's URL and title to pre-fill the share form |
| `storage` | Remember your TravelPanel URL between browser sessions |
| `activeTab` | Access the active tab when you click the extension |
