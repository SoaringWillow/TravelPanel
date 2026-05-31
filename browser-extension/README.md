# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any web page into TravelPanel. AI extracts spots, tips, and wisdom automatically.

## Quick start

### Chrome / Edge / Brave

1. **Generate icons** (one-time setup):
   ```bash
   node create-icons.js
   ```

2. Open **chrome://extensions** (or edge://extensions)
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this `browser-extension/` folder
5. The settings page opens automatically — enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
6. Click the ✈️ icon in your toolbar and start clipping!

### Safari (macOS 14+)

Safari requires converting the Chrome extension using Xcode:

1. Run `xcrun safari-web-extension-converter /path/to/browser-extension/` in Terminal
2. Open the generated Xcode project
3. Build & run (Cmd+R)
4. Enable the extension in Safari → Settings → Extensions

## Usage

1. Navigate to a travel page (YouTube, Instagram, 小红书, TikTok, etc.)
2. Click the **TravelPanel** toolbar icon
3. Click **Clip to TravelPanel**
4. Select a board (or save to Inbox)
5. AI extracts locations + substance (tips, warnings, wisdom) in the background

## What gets extracted

- **Spots** — GPS-pinned locations from the post
- **Substance** — tips, warnings, opinions, "go in the morning"-style wisdom
- **Activities** — things to do at each place
- **Tags** — food, nature, culture, adventure, etc.

## Permissions

- `activeTab` — reads the current tab's URL and title (only when you click the icon)
- `storage` — saves your TravelPanel URL setting locally

No data is sent anywhere until you click "Clip to TravelPanel".

## Development

The extension uses Manifest V3 and plain JavaScript — no build step required.

To regenerate icons after changes to `create-icons.js`:
```bash
node create-icons.js
```

To test locally with the Next.js dev server:
1. Start `npm run dev` in the TravelPanel repo root
2. Set the extension URL to `http://localhost:3000` in Settings
3. Reload the extension after code changes (Extensions page → Reload button)
