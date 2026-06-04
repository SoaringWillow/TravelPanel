# TravelPanel Browser Extension — Setup

A Chrome/Safari extension that clips any travel page into TravelPanel with one click.

## Installation (Developer / Side-load)

### Chrome / Edge / Brave
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Pin the TravelPanel icon to your toolbar

### Safari (macOS 14+)
1. Open **Safari → Settings → Advanced** → tick "Show features for web developers"
2. Open **Safari → Develop → Allow Unsigned Extensions**
3. In Terminal:
   ```bash
   xcrun safari-web-extension-converter browser-extension/ \
     --app-name TravelPanel \
     --bundle-identifier com.yourdomain.travelpanel
   ```
4. Open the generated Xcode project → Run → Allow the extension in Safari settings

## First-time configuration
1. Click the TravelPanel extension icon
2. Click the ⚙ (settings) gear icon
3. Enter your TravelPanel URL — e.g. `https://your-app.vercel.app`
   - For local dev: `http://localhost:3000`
4. Click **Save Settings**

## How it works
1. Navigate to any travel page (Instagram, YouTube, Xiaohongshu, TripAdvisor, etc.)
2. Click the TravelPanel ✈ icon in your toolbar
3. The popup shows the page title and detected platform
4. Click **Clip to TravelPanel** — the share flow opens in a new tab
5. Choose a board (or Inbox) → saved, enriched, and ready to plan from

## Context menu
Right-click any page or link → **Clip to TravelPanel ✈** to clip without opening the popup.

## Regenerating icons
```bash
cd browser-extension
node generate-icons.js
```

## File reference
| File | Purpose |
|------|---------|
| `manifest.json` | Chrome MV3 manifest |
| `popup.html` / `popup.js` | Extension popup UI |
| `background.js` | Service worker — context menu + message relay |
| `options.html` / `options.js` | Settings page (app URL) |
| `generate-icons.js` | PNG icon generator (no deps) |
| `icons/` | Generated PNG icons (16×, 48×, 128×) |
