# TravelPanel Browser Extension

One-click clipper for Chrome and Safari. Sends the current page URL to your TravelPanel `/share` flow where Claude extracts locations + substance automatically.

## Installation

### Chrome (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Pin the TravelPanel icon from the extensions toolbar

### Safari (macOS)

Requires converting to a Safari Web Extension via Xcode:

```bash
xcrun safari-web-extension-converter /path/to/extension/ \
  --project-location ./safari-extension \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build & run, and enable the extension in Safari → Settings → Extensions.

### Edge / Firefox

Edge supports Chrome extensions natively via the same load-unpacked flow.
Firefox: same folder works as a temporary add-on via `about:debugging`.

## Setup

1. Click the extension icon → **Configure** (first launch)
2. Enter your TravelPanel URL, e.g. `https://your-app.vercel.app`
3. Save — you're ready to clip

## Usage

- **Toolbar button**: Click the TravelPanel icon on any travel page → *Clip to TravelPanel*
- **Right-click**: Right-click any link or page → *Clip to TravelPanel*

Both methods open TravelPanel's save flow with the URL pre-filled. Claude extracts locations and substance (tips, warnings, opinions) automatically.

## Development

Icons are generated from `icons/generate.js` (pure Node.js, no external deps):

```bash
node extension/icons/generate.js
```

The extension has no build step — it's vanilla JS + HTML + CSS.
