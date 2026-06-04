# TravelPanel Browser Extension

Save travel inspiration from any website into TravelPanel with one click.  
AI extracts locations, tips, and wisdom automatically.

## What it does

- **Toolbar button** — click the TravelPanel icon to clip the current page URL into TravelPanel
- **Right-click menu** — right-click any page or link → "Save to TravelPanel"
- **Title & notes** — optionally override the page title or add a quick note before saving
- Supports Instagram, YouTube, 小红书, TikTok, Bilibili, and any other URL

## Installation (Chrome / Edge / Brave)

1. Run the icon generator once (requires Node.js):
   ```
   node generate-icons.js
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right)

4. Click **Load unpacked** and select this `browser-extension/` folder

5. The TravelPanel icon will appear in your toolbar. Click it to configure your app URL.

## Configuration

After installing, click the gear icon in the popup (or right-click the extension icon → Options) and enter the URL where your TravelPanel app is deployed:

- **Vercel**: `https://your-app.vercel.app`
- **Local dev**: `http://localhost:3000`

## Safari (macOS / iOS)

Safari requires converting the extension via Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location ./ios/App \
  --app-name TravelPanel \
  --bundle-identifier com.travelpanel.extension
```

Then open the generated Xcode project, build, and enable the extension in Safari settings.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest |
| `popup.html/js` | Toolbar popup UI |
| `background.js` | Context menu service worker |
| `options.html/js` | Settings page (configure app URL) |
| `generate-icons.js` | Generates `icons/icon16/48/128.png` from scratch |
| `icons/icon.svg` | Source SVG for the extension icon |
