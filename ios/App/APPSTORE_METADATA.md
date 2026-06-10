# TravelPanel — App Store Submission Metadata

## App Identity

| Field | Value |
|---|---|
| **App Name** | TravelPanel |
| **Subtitle** | AI Trip Planner & Clipper |
| **Bundle ID** | com.travelpanel.app |
| **Category (Primary)** | Travel |
| **Category (Secondary)** | Productivity |
| **Age Rating** | 4+ |
| **Price** | Free |

---

## App Description (4,000 char max)

Save travel inspiration from anywhere. Plan the perfect trip.

TravelPanel turns your social media saves into a real trip plan — with every tip, warning, and local secret preserved, not thrown away.

**CLIP ANYTHING IN SECONDS**
See a great travel post on Instagram, YouTube, or Xiaohongshu? Share it to TravelPanel in one tap. Our AI instantly extracts the locations AND the wisdom hidden in the post — arrival tips, cash-only warnings, the "skip this, do that" advice locals actually care about.

**WISDOM OVER PINS**
Most travel apps just drop a pin on a map and call it done. TravelPanel captures two layers from every clip: the geographic skeleton (where to go) AND the substance (why it matters, when to visit, what to avoid). When you're standing in front of Tsukiji Market at 7am, you'll thank yourself for saving that "go early" tip.

**AI-POWERED TRIP PLANNING**
When you're ready to go, tap "Begin Planning." TravelPanel's AI builds a day-by-day itinerary from your saved clips — and cites the source for every tip, so you know exactly which post that "cash only" warning came from. No more scrolling back through your camera roll.

**NAVIGATE IN REAL TIME**
Start Trip mode shows your live GPS position alongside your planned stops. Distance and walking time to your next destination, one tap to open directions in Maps. Swipe to advance to the next stop.

**LOG YOUR ACTUAL TRIP**
After (or during) your trip, use the Trip Log to mark what you visited, what you skipped, and add personal notes. Export a summary image to share with friends.

**ORGANIZED YOUR WAY**
Group your clips into Boards — "Tokyo 2025," "Coffee Shops to Try," "Honeymoon Ideas." Swipe to delete or move cards. Long-press for options.

**YOUR DATA, YOUR WAY**
All clips are stored on your device. Export everything as JSON anytime. No account required to get started.

---

## Keywords (100 chars max)

travel,trip planner,itinerary,AI,travel inspiration,clip,save places,maps,japan,tokyo,travel organizer

---

## What's New (version 1.0.0)

First release! Save travel inspiration from any app, let AI extract the wisdom, and plan your perfect trip in one tap.

---

## Privacy Policy URL

https://travelpanel.app/privacy

*(Create a simple privacy policy page before submission. It must address: location data, clipboard access, and data storage. Template below.)*

### Privacy Policy Template

**TravelPanel Privacy Policy**
Last updated: 2026-06-10

TravelPanel ("the App") is a travel planning app.

**Data we collect:**
- URLs you share to the App (processed by Anthropic Claude AI to extract location data)
- Location data (GPS used only in active navigation mode, never stored or transmitted)
- Your saved clips and boards (stored locally on your device via IndexedDB)

**Data we do NOT collect:**
- We do not create accounts or store personal data on our servers
- We do not sell or share your data with third parties
- AI processing (Anthropic API) receives only the URL content, not your identity

**Third-party services:**
- Anthropic API: URL content is sent to extract travel information
- OpenFreeMap: Map tile provider (no personal data sent)

**Contact:** support@travelpanel.app

---

## App Store Screenshots

### Required sizes
- **6.7" iPhone** (iPhone 15 Pro Max): 1290×2796px
- **6.5" iPhone** (iPhone 14 Plus): 1284×2778px  
- **5.5" iPhone** (iPhone 8 Plus): 1242×2208px

### Recommended 5 screenshots (in order)

1. **Home Map View** — "All your saved places on one beautiful map"
   - Show the map with several colorful pins and the TravelPanel logo

2. **Share Sheet** — "Save from any app in one tap"
   - Show the iOS Share Sheet with TravelPanel highlighted

3. **Inbox / Clip Card** — "AI extracts the wisdom, not just the pin"
   - Show a clip card with substance tips highlighted (amber boxes)

4. **Trip Planner** — "Day-by-day plans from your saved clips"
   - Show a generated itinerary with multiple days and sourced tips

5. **Navigation Mode** — "Navigate in real time"
   - Show the full-screen map with GPS dot and bottom HUD

### How to take screenshots
1. Run app in Xcode Simulator (iPhone 15 Pro Max)
2. Navigate to each screen
3. File → Save Screen (⌘S) or Device → Screenshot in Simulator
4. Resize/edit in Preview if needed

---

## Launch Screen

File: `ios/App/App/LaunchScreen.storyboard`

Should show:
- White background
- Centered TravelPanel logo (the 1024×1024 app icon at ~120pt)
- "TravelPanel" wordmark below in SF Pro Rounded Bold, 24pt, #4F46E5

---

## Review Notes for Apple

TravelPanel uses the iOS Share Extension to receive URLs shared from other apps. The Share Extension requires:
- NSExtension in Info.plist (already configured)
- App Group: group.com.travelpanel.app (required for data passing)

The app requests location permission only when the user taps "Start Trip" (navigation mode). No background location is used.

The Anthropic API key is stored as a server-side environment variable (Vercel) and is never included in the app bundle.

---

## Generating App Icons

Run the icon generator to populate all required Xcode icon sizes:

```bash
node scripts/generate-app-icon.js
```

This writes all sizes to:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Then open Xcode → verify the AppIcon asset catalog shows all sizes filled.
