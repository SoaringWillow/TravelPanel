# TravelPanel — App Store Submission Checklist

Use this document before every App Store submission. Items are grouped by category.
Check each item — an unchecked item is a potential rejection reason.

---

## 1. Xcode Project Settings

| Item | Status | Notes |
|------|--------|-------|
| Bundle ID | `[ ]` | Must match App Store Connect: `com.soaringwillow.travelpanel` |
| Version number | `[ ]` | Semantic: `1.0.0` for first submission, `1.x.y` for updates |
| Build number | `[ ]` | Must be higher than any previously uploaded build |
| Deployment target | `[ ]` | iOS 16.0+ recommended (covers ~95% of active devices) |
| Signing team | `[ ]` | Requires paid Apple Developer Program ($99/yr) |
| Capabilities | `[ ]` | Enable **App Groups** (`group.com.travelpanel.app`) in Signing & Capabilities |
| Share Extension target | `[ ]` | Same Team ID, same App Group, Bundle ID: `com.soaringwillow.travelpanel.ShareExtension` |

---

## 2. Icons & Assets

| Item | Status | Notes |
|------|--------|-------|
| App icon 1024×1024 | `[ ]` | PNG, no alpha channel, no rounded corners (Apple applies mask) |
| App icon 512×512 | `[ ]` | For Spotlight |
| All icon sizes | `[ ]` | Use Xcode's AppIcon asset catalog — drop 1024px and let Xcode generate |
| Launch screen | `[ ]` | `LaunchScreen.storyboard` — should match app background colour (#6366f1) |
| No placeholder icons | `[ ]` | Any "question mark" icon → rejection |

**Current state**: Icons generated at 192/512/180/167/152/120px in `public/icons/` via Node.js script.
For App Store, export the 1024px version and add to Xcode's `AppIcon.xcassets`.

---

## 3. Privacy Manifest (Required since iOS 17 / Xcode 15.3)

Apple requires a `PrivacyInfo.xcprivacy` file declaring all API usage and data collection.

| API Used | Declaration Required | Status |
|----------|---------------------|--------|
| `UserDefaults` (App Group) | `NSPrivacyAccessedAPICategoryUserDefaults` | `[ ]` |
| Location services | Listed in Info.plist (already done) | `[x]` |

**How to add**: In Xcode, File → New → Resource → App Privacy.
Add `NSPrivacyAccessedAPITypes` array with reason code `CA92.1` (App Group UserDefaults).

Example `PrivacyInfo.xcprivacy`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyTracking</key>
    <false/>
</dict>
</plist>
```

---

## 4. Info.plist Permissions (already done ✓)

| Key | Value | Status |
|-----|-------|--------|
| `NSLocationWhenInUseUsageDescription` | "TravelPanel uses your location to show nearby saved places." | `[x]` |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Same | `[x]` |
| `NSCameraUsageDescription` | "TravelPanel can scan QR codes and capture inspiration." | `[x]` |
| `NSPhotoLibraryUsageDescription` | "TravelPanel can save screenshots as clip thumbnails." | `[x]` |
| URL scheme `travelpanel://` | Registered | `[x]` |
| App Transport Security | Allow arbitrary loads disabled in production | `[ ]` Verify |

---

## 5. App Store Connect Metadata

### App Information
| Field | Value | Limit |
|-------|-------|-------|
| **Name** | TravelPanel | 30 chars |
| **Subtitle** | Save travel inspiration. Plan better trips. | 30 chars |
| **Category** | Travel | — |
| **Secondary Category** | Productivity | — |

### Description (4000 chars max)
```
TravelPanel turns scattered travel inspiration into organised, AI-powered trips.

Save anything from Instagram, YouTube, WeChat, or Xiaohongshu with one tap — 
TravelPanel's AI extracts locations, activities, and practical tips from every clip.

BUILD YOUR TRIP LIBRARY
• One-tap saving from any social app via the iOS Share Sheet
• AI extracts locations, tips, and insider knowledge (not just pins — the actual wisdom)
• Organise clips into boards: Tokyo 2025, Bali with Friends, Foodie Europe

PLAN SMARTER TRIPS
• Generate AI-powered multi-day itineraries from your saved clips
• Plans cite your saved clips inline: "Avoid Golden Week crowds — from your clip"
• Seasonal context: factor in weather, festivals, and best months
• Export as PDF or calendar events

DISCOVER & REVISIT
• Nearby mode: see your saved spots when you're travelling
• Inspiration Digest: resurface clips you saved weeks ago
• Map view: all your clips on an interactive map

PRIVACY FIRST
• All data stored locally on your device (no account required)
• Share Extension captures inspiration without leaving your app

TravelPanel is for travellers who collect inspiration obsessively and want their clips to 
actually become trips — not just sit in a bookmark folder.
```

### Keywords (100 chars total, comma-separated)
```
travel,trip planner,inspiration,itinerary,map,AI travel,board,clip,save,plan
```

### What's New (for updates, 4000 chars)
```
Version 1.0 — Initial release.
```

---

## 6. Screenshots (Required sizes)

Apple requires screenshots at specific sizes. All must show actual app UI (no mockups with device frames unless using Apple's templates).

| Device | Size | Required |
|--------|------|----------|
| 6.7" iPhone (iPhone 15 Pro Max) | 1290 × 2796 px | **Required** |
| 6.1" iPhone (iPhone 15) | 1179 × 2556 px | Optional (uses 6.7" if missing) |
| 5.5" iPhone (iPhone 8 Plus) | 1242 × 2208 px | **Required** |
| 12.9" iPad Pro | 2048 × 2732 px | Required if submitting for iPad |

**Recommended screenshot order**:
1. Map view with pins (hero shot — "See your inspiration on the map")
2. Share Extension saving a clip ("One tap to save from any app")
3. Clip detail with substance tips ("AI extracts the wisdom, not just the pin")
4. Trip planner with AI itinerary ("Your clips become a real plan")
5. Board view with clip cards ("Organise by destination")

---

## 7. Age Rating

Select age rating in App Store Connect based on your answers to the questionnaire:

| Category | Answer |
|----------|--------|
| Cartoon/Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content | None |
| Profanity | None |
| Alcohol, Tobacco, Drugs | None |
| Medical/Treatment | None |
| Horror | None |
| Gambling | None |

**Expected rating**: 4+ (suitable for all ages)

---

## 8. Privacy Labels (App Privacy section in App Store Connect)

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Location | Yes (precise) | No | No |
| Usage Data | Yes (analytics) | No | No |
| Other Data | No | — | — |

**Location**: Used for "Nearby Clips" feature. Not stored persistently beyond the session.
**Analytics**: PostHog (if key provided) — anonymised. No user identity linked.

---

## 9. Export Compliance

| Question | Answer |
|----------|--------|
| Does your app use encryption beyond what iOS provides? | **No** |
| Does your app implement proprietary encryption? | **No** |

Check "No" — the app uses standard HTTPS (iOS system encryption). No special export compliance filing needed.

---

## 10. Pre-Submission Checklist

- `[ ]` App runs on a physical iPhone (not just simulator)
- `[ ]` Share Extension tested: share a URL from Safari → app opens correctly
- `[ ]` Deep link tested: `travelpanel://share?url=https://example.com` opens share page
- `[ ]` Dark mode tested on iPhone
- `[ ]` GPS / Nearby mode tested on physical device
- `[ ]` No crashes on launch in release build (Profile → Instruments → Leaks)
- `[ ]` App Store screenshots taken on physical devices or Simulator at correct sizes
- `[ ]` Privacy manifest (`PrivacyInfo.xcprivacy`) added to both app and Share Extension targets
- `[ ]` Build uploaded to TestFlight and tested for 1+ day before submitting for review
- `[ ]` App Review Information: demo account not needed (no sign-in required)
- `[ ]` Contact information filled in (email: jiangnan027@gmail.com)

---

## 11. Production Build Steps

```bash
# 1. Set server URL to production
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build

# 2. Open Xcode
npx cap open ios

# 3. In Xcode:
#    - Select "Any iOS Device (arm64)" as destination
#    - Product → Archive
#    - Window → Organizer → Distribute App → App Store Connect
#    - Upload

# 4. In App Store Connect:
#    - Wait for processing (~30 min)
#    - Add to TestFlight for internal testing
#    - Submit for App Store Review
```

---

*Last updated: 2026-06-09*
