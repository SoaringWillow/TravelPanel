# TravelPanel Browser Extension

One-click travel inspiration clipper for Chrome, Edge, and Brave (Manifest V3).

## Features

- **Clip any page** — save a travel URL to your TravelPanel boards with one click
- **Platform detection** — automatically badges YouTube, Instagram, 小红书, TikTok, Weibo, Bilibili
- **Right-click menu** — clip any page or link via context menu
- **Keyboard shortcut** — configurable in `chrome://extensions/shortcuts`
- **Configurable URL** — points to your TravelPanel deployment

## Installation (Chrome / Edge / Brave)

### From source (developer mode)

1. **Generate icons** (one-time setup):
   ```bash
   node create-icons.js
   ```

2. Open your browser and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked** and select the `browser-extension/` folder

5. The TravelPanel pin icon appears in your toolbar — click it to clip any travel page

### Configure the app URL

The extension defaults to `https://travelpanel.vercel.app`.
To point it at your own deployment:

1. Right-click the extension icon → **Options**
2. Enter your deployment URL (e.g. `https://your-app.vercel.app`)
3. Click **Save Settings**

## How it works

1. Navigate to any travel-related page (YouTube video, Instagram post, Xiaohongshu link, etc.)
2. Click the TravelPanel extension icon (or right-click → **Clip this page**)
3. The TravelPanel share page opens in a new tab
4. Select a board (or create one), then save — AI extraction runs in the background

## Files

```
browser-extension/
├── manifest.json     — Chrome Manifest V3
├── popup.html/css/js — Extension popup UI
├── options.html/css/js — Settings page (app URL)
├── background.js     — Service worker (context menu, keyboard shortcut)
├── create-icons.js   — Generates icons/icon{16,48,128}.png from Node.js
└── icons/            — Generated PNG icons
```

## Safari (macOS / iOS)

Use Apple's [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari):

```bash
xcrun safari-web-extension-converter browser-extension/ --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project and run/archive it.
