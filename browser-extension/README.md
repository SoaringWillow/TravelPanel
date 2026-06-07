# TravelPanel Clipper — Browser Extension

Clip any travel page directly into your TravelPanel boards with one click.

## Features

- **One-click clipping** — clip the current tab into TravelPanel from the toolbar icon
- **Right-click menu** — clip any link or page via the context menu
- **Board picker** — see your boards (requires B1 Supabase; defaults to Inbox)
- **Platform detection** — recognizes Instagram, YouTube, 小红书, TikTok, Bilibili, and more
- **Configurable URL** — works with any TravelPanel deployment (Vercel, localhost, self-hosted)

## Installation (Chrome / Arc / Brave / Edge)

1. Clone this repo and navigate to `browser-extension/`
2. Open `chrome://extensions` (or equivalent)
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** and select the `browser-extension/` folder
5. Click the ✈️ icon → ⚙️ Settings → enter your TravelPanel URL → Save

## Installation (Safari)

Safari requires converting the extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build, and enable in Safari → Settings → Extensions.

## Configuration

| Setting | Description |
|---------|-------------|
| TravelPanel URL | Your deployed app URL (e.g. `https://your-app.vercel.app`) |

Use `http://localhost:3000` for local development.

## Icon Generation

If you modify the icons, regenerate PNGs with:

```bash
cd icons
npm install canvas
node generate-icons.js
```

## Roadmap

- **B1** — Board picker will populate from Supabase once cloud sync is active
- **B3** — Xiaohongshu support: share images (not just URLs) via the extension
- **B4** — Vibe search from the popup ("minimalist cafes Tokyo")
