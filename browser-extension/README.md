# TravelPanel Clipper — Browser Extension

Clip any travel page to your TravelPanel boards in one click.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The TravelPanel icon appears in your toolbar

## Install (Safari — macOS 14+)

Safari supports Manifest V3 extensions. Convert with Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build and run. Enable the extension in **Safari → Settings → Extensions**.

## First-time setup

1. Click the extension icon → **Settings (⚙)**
2. Enter your TravelPanel app URL (e.g. `https://your-app.vercel.app`)
3. Click **Save**

The URL is stored in `chrome.storage.sync` — it syncs across your signed-in Chrome profile automatically.

## Usage

1. Navigate to any Instagram post, YouTube travel video, 小红书 note, TripAdvisor page, etc.
2. Click the TravelPanel toolbar icon
3. Click **Clip to TravelPanel**
4. The share page opens in a new tab — pick a board and Claude extracts locations + wisdom

## Supported platforms

| Platform | Detected as |
|---|---|
| instagram.com | Instagram |
| youtube.com / youtu.be | YouTube |
| tiktok.com | TikTok |
| xiaohongshu.com / xhslink.com | 小红书 |
| douyin.com | Douyin |
| bilibili.com | Bilibili |
| twitter.com / x.com | Twitter/X |
| pinterest.com | Pinterest |
| tripadvisor.com | TripAdvisor |
| maps.google.com | Maps |
| any other page | Web |

## Permissions used

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `storage` | Save your TravelPanel app URL setting |
