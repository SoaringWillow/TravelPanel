# TravelPanel Browser Extension — Install Guide

Clip any travel post (Instagram, YouTube, 小红书, Douyin, TikTok, Bilibili, Reddit, or any web page) into your TravelPanel boards with one click.

---

## Step 1 — Generate the icons (one-time)

The extension needs three PNG icons. Generate them with the bundled helper:

1. Open `icons/generate-icons.html` in Chrome or Firefox
2. Click **Download** for each of the three sizes (`icon16.png`, `icon48.png`, `icon128.png`)
3. Move the downloaded files into the `icons/` folder

---

## Step 2 — Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The TravelPanel pin icon appears in your toolbar

---

## Step 3 — Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json` inside this folder
4. The extension loads for your current browser session

> For a permanent Firefox install, the extension needs to be signed via [AMO](https://addons.mozilla.org/). For personal use, enable `xpinstall.signatures.required = false` in `about:config`.

---

## Step 4 — Configure your TravelPanel URL

On first install the **Settings** page opens automatically.

Enter your TravelPanel app URL, for example:
- `https://your-app.vercel.app` (production)
- `http://localhost:3000` (local dev)

Click **Save Settings**. You only need to do this once.

---

## Step 5 — Use it

**Popup** — click the extension icon on any page:
- The current page's title, URL, and platform are detected automatically
- Click **✈️ Clip to TravelPanel** to open the save flow in a new tab
- Complete the board selection in TravelPanel

**Right-click menu** — right-click any page or link and choose **Clip to TravelPanel**. Works on links too, so you can clip a URL without navigating to it first.

---

## Safari (macOS / iOS)

Convert the Manifest V3 extension to a Safari Web Extension using Apple's built-in converter:

```bash
# Requires Xcode 13+ and macOS 11+
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in **Safari → Settings → Extensions**.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Extension icon is missing / broken | Run the icon generator and place PNGs in `icons/` |
| "Nothing to clip here" on a normal page | Make sure the extension has `tabs` permission (reload if just installed) |
| Clip opens the wrong app | Open Settings and update the TravelPanel URL |
| Can't load in Chrome: manifest error | Ensure you selected the `browser-extension/` folder, not a parent directory |
