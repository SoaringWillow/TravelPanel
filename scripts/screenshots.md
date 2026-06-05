# TravelPanel — App Store Screenshots Guide

## Required sizes

| Device | Resolution | Notes |
|--------|-----------|-------|
| iPhone 6.9" (iPhone 15 Pro Max) | 1320 × 2868 px | Required |
| iPhone 6.7" (iPhone 14 Plus) | 1290 × 2796 px | Required |
| iPad 12.9" (iPad Pro M2) | 2048 × 2732 px | Required for iPad listing |

All screenshots should be PNG, sRGB color space, no transparency.

---

## 5 key screens to capture

### Screen 1 — Map view with pins
**Route**: Home page (`/`)  
**Setup**:
1. Load app with demo seed data (first launch, or clear storage and reload)
2. Wait for all map pins to appear
3. Pan to show a cluster of pins across a destination (e.g. Tokyo or Paris)
4. Make sure the search bar is visible at top

**What to highlight**: The visual density of pinned inspiration — clips become a personal map.

---

### Screen 2 — Share / Clip flow
**Route**: Share sheet (`/share`) or ImportSheet open on home page  
**Setup**:
1. Open ImportSheet by tapping the + button
2. Paste a Xiaohongshu or Instagram URL
3. Wait for the preview card to appear (thumbnail + locations found)
4. Capture the "3 places found" state before tapping "Add to collection"

**What to highlight**: The AI extraction in action — social post → structured travel data.

---

### Screen 3 — Wisdom detail / clip card
**Route**: Inbox page (`/inbox`) with a clip that has substance  
**Setup**:
1. Make sure you have at least one clip with substance items (💡 tips shown)
2. Expand an InboxCard that shows "💡 5 tips"
3. Optionally open the clip detail to show tip content

**What to highlight**: The substance layer — the actual wisdom extracted beyond just map pins.

---

### Screen 4 — Trip plan view
**Route**: Plan page (`/plan/[boardId]`) after generating a plan  
**Setup**:
1. Create a board with 5–8 clips from a single destination
2. Generate a 3-day plan
3. Wait for plan to complete
4. Select Day 2 in the day strip
5. Capture the day activities view with sourced tips (emerald "from your clip" cards)

**What to highlight**: Sourced wisdom in the itinerary — "from your clip: best ramen in Tokyo".

---

### Screen 5 — GPS trip mode / nearby clips
**Route**: Home page in Trip Mode  
**Setup**:
1. Enable Trip Mode by tapping the "On Trip" button
2. Make sure location permission is granted
3. Show the nearby clips panel at the bottom (if you have clips near your location)
4. Or stage it by editing a clip's coordinates to match your current location

**What to highlight**: Real-time nearby discovery during the actual trip.

---

## Taking screenshots in Xcode Simulator

```bash
# 1. Build and run the app in Xcode with the target simulator:
#    iPhone 15 Pro Max (for 6.9" screenshots)
#    iPhone 14 Plus (for 6.7" screenshots)
#    iPad Pro 12.9-inch (M2) (for iPad screenshots)

# 2. In Simulator menu: File → Save Screen
#    Or press Cmd+S to save screenshot to Desktop

# 3. Screenshots are saved as PNG automatically at native resolution
```

## Using a physical device (recommended for GPS screen)

1. Set up the app with `CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build`
2. Archive and install via Xcode on a real device
3. Use iPhone's built-in screenshot (Side button + Volume Up)
4. Transfer from Photos app to Mac via AirDrop or Image Capture

## Framing (optional, for marketing)

Use [Rottenwood](https://rottenwood.app) or [AppMockup](https://app-mockup.com) to frame
screenshots inside device bezels. Use TravelPanel's teal color (#0d9488) as the background.

---

## App Store Connect upload checklist

- [ ] Screen 1: Map with pins — 6.9" + 6.7" + iPad
- [ ] Screen 2: Share/clip flow — 6.9" + 6.7" + iPad
- [ ] Screen 3: Wisdom detail — 6.9" + 6.7" + iPad
- [ ] Screen 4: Trip plan — 6.9" + 6.7" + iPad
- [ ] Screen 5: GPS trip mode — 6.9" + 6.7" + iPad
- [ ] App preview video (optional, 15–30s MP4)
- [ ] Promotional text (170 chars max): "Clip travel inspiration from any social app. AI extracts the wisdom. Your map, your plan, your trip."
