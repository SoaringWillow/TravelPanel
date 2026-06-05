# TravelPanel Clipper — Browser Extension

A Chrome/Safari extension that lets you clip any webpage into your TravelPanel boards with one click. The extension calls TravelPanel's extraction API to preview locations and insights before saving.

## Features

- **One-click clipping** from any webpage
- **Live preview** — shows extracted locations and insights before saving
- **Context menu** — right-click any page or link to clip it
- **Keyboard shortcut** — `Alt+Shift+T` (Mac: `Cmd+Shift+T`)
- **Configurable** — works with your local dev server or deployed Vercel URL

## Install in Chrome / Edge / Brave

1. Generate icons (one-time):
   ```bash
   python3 extension/create_icons.py
   ```
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `extension/` folder

## Install in Safari (macOS)

Safari requires converting the extension to a Safari Web Extension:

```bash
xcrun safari-web-extension-converter extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project and run it. Enable the extension in **Safari → Preferences → Extensions**.

## Configuration

Click the gear icon ⚙ in the popup (or right-click the extension icon → Options) to set your TravelPanel URL:

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Vercel deploy | `https://your-app.vercel.app` |

Use the **Test** button to verify the connection before saving.

## How it works

1. Click the extension icon while viewing any travel-related page
2. The popup calls `/api/import` on your TravelPanel instance
3. Extracted locations and insights are shown as a preview
4. Click **Save to TravelPanel** — a small popup opens the `/share` page with the URL pre-filled
5. Confirm the save and the clip lands in your Inbox

## File structure

```
extension/
├── manifest.json       Manifest V3 declaration
├── popup.html/.js/.css Extension popup UI
├── background.js       Service worker (context menu)
├── options.html/.js    Settings page
├── create_icons.py     Generates icon PNGs (run once)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```
