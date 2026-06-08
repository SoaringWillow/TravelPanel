# TravelPanel Clipper — Browser Extension

Clip any travel page into TravelPanel with one click.

## Supported browsers

| Browser | Support |
|---------|---------|
| Chrome / Chromium | ✅ Full support |
| Edge | ✅ Full support (same engine) |
| Brave | ✅ Full support |
| Safari | ⚠️ Requires Xcode conversion (see below) |
| Firefox | ⚠️ Minor manifest adjustments needed |

---

## Chrome / Edge / Brave — Quick install

1. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select this `browser-extension/` directory
5. The TravelPanel pin icon appears in your toolbar

### First-time setup

1. Click the extension icon
2. Click the gear ⚙️ → enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
3. Click **Save**

That's it. On any travel webpage, click the extension → **Clip to TravelPanel**.

---

## How it works

1. Click the extension icon on any webpage
2. The popup shows the current page title, URL, and detected platform (WeChat, Instagram, YouTube, etc.)
3. Click **Clip to TravelPanel** — the share flow opens in a new tab
4. Pick a board (or save to Inbox)
5. TravelPanel extracts locations + wisdom in the background

**Right-click shortcut:** Right-click any page or link → **Clip to TravelPanel**

---

## Safari — Xcode conversion

Apple requires Safari extensions to be packaged as macOS/iOS apps.

```bash
# From the repo root:
xcrun safari-web-extension-converter browser-extension/ \
  --project-location ios/SafariExtension \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.yourteam.travelpanel.clipper
```

Open the generated Xcode project, build, and run to install in Safari.

---

## Regenerating icons

If you modify `icons/icon.svg`, regenerate PNGs with:

```bash
node generate-icons.js
# (requires: npm install sharp in this directory)
```
