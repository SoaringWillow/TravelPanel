# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any page (articles, YouTube, TikTok, Xiaohongshu, Instagram) directly into your TravelPanel boards. Claude automatically extracts locations, tips, warnings, and travel wisdom from the page.

## Install in Chrome / Brave / Edge / Arc

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The 📍 icon appears in your toolbar — click it and set your TravelPanel URL

## Install in Safari (macOS)

Safari requires converting the extension to a native Safari Web Extension via Xcode.

### Prerequisites
- macOS 12+, Xcode 14+
- Xcode command line tools: `xcode-select --install`

### Steps

```bash
# From the repo root
xcrun safari-web-extension-converter browser-extension \
  --app-name "TravelPanel Clipper" \
  --bundle-id com.travelpanel.clipper \
  --no-prompt
```

This generates an Xcode project. Open it, build & run, then:
1. Safari → Settings → Extensions → Enable **TravelPanel Clipper**
2. Click the icon and configure your app URL

## First-time Setup

After installing, the **Settings** page opens automatically. Enter your TravelPanel app URL:

| Environment | URL |
|---|---|
| Production (Vercel) | `https://your-app.vercel.app` |
| Local dev | `http://localhost:3000` |

Hit **Save**, then **Test Connection** to verify.

## Usage

1. Browse to any travel page (article, YouTube video, blog post, Xiaohongshu post, etc.)
2. Click the 📍 TravelPanel icon in your toolbar
3. Review the page info and platform badge
4. Click **Clip to TravelPanel**
5. TravelPanel opens — pick which board to save to
6. Claude extracts locations + travel wisdom in the background

## How it works

The extension passes the current page URL to TravelPanel's `/share` page. The same Claude-powered extraction pipeline that powers the iOS Share Sheet runs on the clipped URL, extracting:

- **Spots** — named locations with GPS coordinates
- **Substance** — tips, warnings, opinions, wisdom from the post content

Both layers are stored on your device and surfaced in the trip planner.

## Supported platforms

The extension works on any URL. Platform-specific detection shows a badge for:

| Platform | Badge color |
|---|---|
| Xiaohongshu (小红书) | Red |
| WeChat / 微信 | Green |
| Douyin / TikTok | Dark |
| Bilibili | Blue |
| YouTube | Red |
| Instagram | Pink |
| X / Twitter | Blue |
| TripAdvisor | Teal |
| Any website | Indigo |

## Privacy

The extension only reads the URL and title of the active tab when you click the clip button. No data is collected or sent to any server — it opens your own TravelPanel app.
