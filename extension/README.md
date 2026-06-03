# TravelPanel Browser Extension

Clip travel inspiration from any page (Instagram, YouTube, blogs) into your TravelPanel boards with one click.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `extension/` folder
4. Click the TravelPanel icon in your toolbar and open **Settings**
5. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
6. Click **Save Settings**

## Install (Safari)

Safari requires converting the extension using Xcode:

```bash
xcrun safari-web-extension-converter /path/to/TravelPanel/extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project and run it. Enable the extension in Safari → Settings → Extensions.

## Usage

- **Click** the toolbar icon while on any travel page
- Or press **Alt+S** (configurable)
- Hit **Save to TravelPanel** — the share page opens in a new tab
- Assign the clip to a board; Claude extracts locations + wisdom automatically

## Development

Icons are generated from `generate-icons.js`:

```bash
node generate-icons.js
```

The extension uses Manifest V3 with no external dependencies.
