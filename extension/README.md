# TravelPanel Clipper — Browser Extension

Clip any travel blog, YouTube video, or social media post into TravelPanel with one click.
Claude extracts **places** (with GPS) AND **substance** (tips, warnings, wisdom) from the page.

## Install in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The ✈️ icon appears in your toolbar

## Install in Safari

Safari requires converting the extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/extension/ \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.yourname.travelpanelclipper
```

Then open the generated Xcode project, build, and enable in Safari → Settings → Extensions.

## Configure

1. Click the ✈️ toolbar icon → Settings (gear icon) — or right-click → Options
2. Enter your TravelPanel URL:
   - **Local dev**: `http://localhost:3000`
   - **Production**: your Vercel deployment URL (e.g. `https://my-app.vercel.app`)
3. Click **Test connection** to verify
4. Click **Save**

## Usage

### Popup flow
1. Navigate to any travel page
2. Click the ✈️ icon
3. Click **Preview & Clip** — Claude analyzes the page (~5–10s)
4. Preview shows extracted places, insights, and activities
5. Click **Open in TravelPanel** to choose a board and save

### Context menu (right-click)
- **On a page**: right-click → *Clip this page with TravelPanel*
- **On a link**: right-click → *Clip link with TravelPanel*

Both open the TravelPanel Share Sheet directly.

## How it works

The extension calls `/api/import` on your TravelPanel backend with the current page URL.
Claude performs two-layer extraction:

| Layer | What it captures |
|---|---|
| **Spots** | Real locations with GPS coordinates |
| **Substance** | Tips, warnings, opinions, wisdom from the post content |

On save, it opens TravelPanel's `/share` page where you pick a board.

## Development

The extension uses **Manifest V3** and requires no build step — load directly from this folder.

Files:
- `manifest.json` — Extension config
- `popup.html/css/js` — Toolbar popup UI
- `options.html/js` — Settings page
- `background.js` — Service worker (context menus)
- `icons/` — Extension icons (16px, 48px, 128px PNG)

To regenerate icons with a different color, run:
```bash
python3 icons/generate.py
```
