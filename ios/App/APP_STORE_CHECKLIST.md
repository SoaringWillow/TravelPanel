# TravelPanel — App Store Submission Checklist

Complete these steps in order before submitting to the App Store.
Steps marked 🤖 are already done in code; steps marked 🧑 require manual action in Xcode or App Store Connect.

---

## Prerequisites

- [ ] 🧑 Apple Developer account enrolled ($99/year) — https://developer.apple.com
- [ ] 🧑 Xcode 15+ installed
- [ ] 🧑 macOS Sonoma or later recommended
- [ ] 🧑 CocoaPods installed: `sudo gem install cocoapods`

---

## Step 1: Install dependencies

```bash
cd ios/App
pod install
```

Open **`App.xcworkspace`** (not `.xcodeproj`).

---

## Step 2: Signing & Capabilities

In Xcode, select the **App** target → **Signing & Capabilities**:

- [ ] 🧑 Set **Team** to your Apple Developer team
- [ ] 🧑 Set **Bundle Identifier** to `com.travelpanel.app`
- [ ] 🧑 Enable **App Groups** → add `group.com.travelpanel.app`
- [ ] 🧑 Enable **Associated Domains** → add `applinks:travelpanel.app`

For the **ShareExtension** target:
- [ ] 🧑 Set **Team** to the same team
- [ ] 🧑 Set **Bundle Identifier** to `com.travelpanel.app.ShareExtension`
- [ ] 🧑 Enable **App Groups** → add `group.com.travelpanel.app`

---

## Step 3: App Icon

- [ ] 🧑 Design a 1024×1024px icon (PNG, no alpha channel)
- [ ] 🧑 Place it at `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- [ ] 🧑 In Xcode, open the asset catalog and verify the icon shows in the 1024×1024 slot
- 💡 Use https://www.appicon.co/ to generate all sizes from one image

---

## Step 4: Launch Screen

- [ ] 🧑 Design a launch screen image (1290×2796 for iPhone 15 Pro Max)
- [ ] 🧑 Place it in `ios/App/App/Assets.xcassets/Splash.imageset/`
- [ ] 🧑 Background color: `#6366f1` (indigo)

---

## Step 5: Privacy Manifest

- [x] 🤖 `PrivacyInfo.xcprivacy` created at `ios/App/App/PrivacyInfo.xcprivacy`
- [ ] 🧑 In Xcode, **right-click the App folder** → **Add Files to "App"**
- [ ] 🧑 Select `PrivacyInfo.xcprivacy` → ensure **App target** is checked (NOT ShareExtension)
- [ ] 🧑 Verify it appears in **Build Phases → Copy Bundle Resources**

If you enable PostHog analytics, update `NSPrivacyCollectedDataTypes` in the manifest.

---

## Step 6: URL Scheme Verification

- [ ] 🧑 In Xcode, **App** target → **Info** tab → **URL Types**
- [ ] 🧑 Verify `travelpanel` scheme is listed with role `Editor`
- [x] 🤖 `Info.plist` already has this configured

---

## Step 7: Production Build

```bash
# Point Capacitor at your deployed Vercel URL
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build

# Or sync without building:
npx cap sync ios
```

Then in Xcode:
- [ ] 🧑 **Product → Archive** (`⌘⇧B` then **Product → Archive**)
- [ ] 🧑 Wait for archive to complete
- [ ] 🧑 In the Organizer, click **Distribute App**
- [ ] 🧑 Choose **App Store Connect**
- [ ] 🧑 Follow upload wizard

---

## Step 8: App Store Connect Metadata

Go to https://appstoreconnect.apple.com → My Apps → + New App

### App Info
- **Name**: TravelPanel
- **Subtitle**: AI Trip Planner & Clipper
- **Bundle ID**: com.travelpanel.app
- **SKU**: travelpanel-001
- **Primary Language**: English (US)
- **Category**: Travel → Navigation

### Description (paste as-is)

```
TravelPanel turns travel inspiration from any social app into a personal trip planner.

CLIP ANYTHING
Share links from Instagram, YouTube, WeChat, Xiaohongshu, or Douyin to your iOS Share Sheet. AI extracts the exact locations and practical wisdom (tips, warnings, seasonal advice) from each post — not just a pin on a map.

ORGANIZE INTO BOARDS
Group clips by destination into collections. Each board gets an AI-generated summary of the vibe and highlights.

PLAN YOUR TRIP
Generate a detailed day-by-day itinerary that cites your own saved clips inline. Your Tokyo plan draws on the actual tips from your saved Tokyo videos — not generic advice.

TAKE IT ON THE TRIP
Use the GPS Nearby mode to surface saved tips when you're physically close to a location. Mark places as visited to build your travel diary.

SHARE WITH FRIENDS
Share any board via a link — friends see your clips, map, and recommendations without needing an account.
```

### Keywords (100 chars max)
```
travel,trip planner,itinerary,travel inspiration,AI travel,save travel links,travel journal
```

### Screenshots (required sizes)
- [ ] 🧑 6.7" iPhone (iPhone 15 Pro Max): 1290×2796 — at least 3 screenshots
- [ ] 🧑 5.5" iPhone (iPhone 8 Plus): 1242×2208 — required
- [ ] 🧑 iPad Pro 12.9": 2048×2732 — required for iPad support

Suggested screenshots:
1. Map view with pins + "Save inspiration from any app" headline
2. Inbox with clip cards (dark mode) + "AI extracts locations and tips" headline
3. Trip plan view + "AI-generated itinerary with your own tips" headline
4. Share a board + "Share your collection with friends" headline

### Age Rating
- **Age Rating**: 4+ (no user-generated content, no adult content)

### Export Compliance
- [ ] 🧑 Select **No** for encryption (no custom cryptography used)

---

## Step 9: TestFlight

Before public release:
- [ ] 🧑 Add internal testers in App Store Connect → TestFlight
- [ ] 🧑 Test the Share Sheet on a real device (not Simulator)
- [ ] 🧑 Test dark mode + Dynamic Island on iPhone 14 Pro or later
- [ ] 🧑 Test on iPad (UI works, though not fully optimized)
- [ ] 🧑 Test offline mode: enable Airplane Mode and verify the offline banner appears

---

## Step 10: Release

- [ ] 🧑 Submit for App Store Review
- [ ] 🧑 Typical review time: 1–3 business days
- [ ] 🧑 Enable phased release (roll out to 5% → 10% → 20% ... 100% over 7 days)

---

## Environment Variables (required before build)

| Variable | Required | Where to set |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Vercel project settings → Environment Variables |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Vercel project settings |
| `RESEND_API_KEY` | Optional | Vercel project settings |
| `NEXT_PUBLIC_SUPABASE_URL` | Future | Vercel project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Future | Vercel project settings |
| `CAPACITOR_SERVER_URL` | **Yes** (build time) | Set in shell before `npm run ios:build` |

---

## Post-Launch Monitoring

- Monitor crash reports in Xcode → Organizer → Crashes
- Monitor API costs in Anthropic dashboard → Usage
- Track North Star metric (weekly clips per active user) via PostHog
