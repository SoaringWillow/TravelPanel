# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any page into TravelPanel boards. Works in Chrome, Edge, and Brave (Manifest V3).

## Setup

### 1. Generate icons (first time only)

```bash
node create-icons.js
```

### 2. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

### 3. Configure your TravelPanel URL

1. Click the extension icon → gear icon (or right-click → Options)
2. Enter your TravelPanel app URL, e.g. `https://my-app.vercel.app`
3. Save

For local development, enter `http://localhost:3000` and click **Use dev**.

## Usage

| Action | How |
|--------|-----|
| **Quick Clip** | Click the extension icon → Quick Clip — opens the save page immediately |
| **Preview first** | Click the extension icon → Preview — AI extracts locations & insights, then you confirm |
| **Right-click any link** | Context menu → *Clip link to TravelPanel* |
| **Right-click on page** | Context menu → *Clip this page to TravelPanel* |

## Building for Safari

To use this extension in Safari, use Xcode's [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/converting_a_web_extension_for_safari):

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

## File structure

```
browser-extension/
├── manifest.json       # Manifest V3
├── popup.html/css/js   # Extension popup UI
├── background.js       # Service worker (context menus, keyboard shortcuts)
├── options.html/css/js # Settings page
├── create-icons.js     # Icon generator (pure Node.js, no dependencies)
└── icons/              # Generated PNG icons (run create-icons.js)
```
