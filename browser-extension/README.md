# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any page in one click. Claude extracts locations and travel wisdom automatically.

## What it does

- **One-click save** — Click the extension icon on any travel blog, Instagram link, or itinerary page
- **AI extraction** — Claude finds locations (with GPS coordinates) AND travel wisdom (tips, warnings, opinions) from the page
- **Board organization** — Save clips to named boards (Tokyo Trip, Bali Ideas, etc.)
- **Context menu** — Right-click any page or link → "Save to TravelPanel"
- **Background retry** — Failed extractions retry automatically up to 3 times

## Install (Chrome / Edge)

1. **Deploy TravelPanel** (or run locally with `npm run dev`)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `browser-extension/` folder
5. Click the extension icon → **Settings** → enter your app URL (e.g. `https://your-app.vercel.app`)

## Install (Safari)

Safari requires converting the Chrome extension using Xcode:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension
```

Then open the generated Xcode project → build → enable in Safari → Advanced → Developer → Allow Unsigned Extensions.

## Configuration

| Setting | Description |
|---|---|
| **App URL** | Your deployed TravelPanel URL (e.g. `https://your-app.vercel.app`) or `http://localhost:3000` for local dev |
| **Boards** | Create boards here; they're available when clipping |

## How it works

```
User clicks extension
        ↓
Extension captures current tab URL + title
        ↓
Popup shows URL preview + board selector
        ↓
User clicks "Save" → item saved instantly with pending status
        ↓
Background service worker calls /api/import (Claude extraction)
        ↓
Item updated with: locations, activities, tags, substance (tips/warnings/wisdom)
        ↓
Badge count updated, retry queue activated for any failures
```

## Data storage

Clips are stored in `chrome.storage.local` (up to ~10MB). They are separate from the main app's IndexedDB — **cloud sync** via Supabase is planned for a future release (Phase B1).

## Rate limits

The extension respects the same rate limits as the app:
- 30 enrichments per day (resets midnight UTC)
- Failed items retry up to 3 times with automatic backoff

## Generating better icons

Replace the placeholder icons with custom artwork:

```bash
cd browser-extension
npm install canvas    # or: brew install pkg-config cairo pango libpng
node generate-icons.js
```

Or replace the files in `icons/` with your own 16×16, 32×32, 48×48, and 128×128 PNG files.

## Development

The extension is plain JavaScript (no build step). Edit files and reload the extension in `chrome://extensions` to see changes.

```
browser-extension/
├── manifest.json     # Extension config (Manifest V3)
├── popup.html        # Popup UI
├── popup.js          # Popup logic
├── background.js     # Service worker (context menu, retry queue, enrichment)
├── options.html      # Settings page
├── options.js        # Settings logic
├── styles.css        # Shared styles
├── generate-icons.js # Icon generation script
└── icons/            # Extension icons (16, 32, 48, 128px PNG)
```
