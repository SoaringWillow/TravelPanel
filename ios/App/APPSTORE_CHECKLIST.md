# TravelPanel — App Store Submission Checklist

Use this checklist before submitting to App Store Connect. Items marked ✅ are already done; items marked ☐ require manual action in Xcode or App Store Connect.

---

## 1. Bundle ID & Signing

- ☐ Bundle ID: set to your registered ID (e.g. `com.yourname.travelpanel`) in Xcode → TARGETS → App → Signing & Capabilities
- ☐ Team: select your Apple Developer team
- ☐ Automatically manage signing (or manual profile if you prefer)
- ☐ Deployment target: iOS 14.0+ recommended (Capacitor 8 requires iOS 14)

---

## 2. Info.plist — Usage Descriptions (Required for App Review)

Add these keys to `ios/App/App/Info.plist` if not already present:

```xml
<!-- Required if using GPS (C1 On-Trip mode) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>TravelPanel uses your location to show nearby saved spots when you're on a trip.</string>

<!-- Required if you add photo library access (e.g. picking cover images) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>TravelPanel can save map screenshots to your photo library.</string>

<!-- Share Extension already in Info.plist for the extension target -->
```

- ✅ URL scheme `travelpanel://` is configured in Info.plist
- ✅ App Transport Security is configured (Capacitor handles this)

---

## 3. Privacy Manifest (Required for iOS 17+ — App Store)

Create `ios/App/App/PrivacyInfo.xcprivacy` with the following content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- No personal data collected beyond what's stored locally on device -->
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- UserDefaults (App Group for Share Extension) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

Add the file to the App target in Xcode (File → Add Files to "App").

---

## 4. App Store Connect Setup

### Basic Info
- ☐ App Name: **TravelPanel** (or localised variant)
- ☐ Subtitle: *AI travel inspiration clipper*
- ☐ Primary Category: **Travel**
- ☐ Secondary Category: Utilities
- ☐ Age Rating: 4+ (no objectionable content)
- ☐ Price: Free (or your chosen tier)

### Description Template
```
TravelPanel turns your travel inspiration into a day-by-day trip plan.

Save any travel post from Instagram, YouTube, or Xiaohongshu using the iOS Share Sheet. Claude AI automatically extracts locations AND tips — not just a pin on a map, but the hidden gems, price warnings, and local wisdom from every post.

Then tap "Plan this trip" on any board to get a full day-by-day itinerary, citing your own saved clips as the source.

FEATURES
• iOS Share Extension — clip from any app in one tap
• AI extracts both GPS spots and substance (tips, warnings, wisdom)
• Interactive map of all your saved places
• Multi-day trip planner powered by Claude
• Dark mode + full offline access to saved clips
• Export plans to PDF or Calendar
• Shared boards — send a board link to a travel companion
```

### Keywords (100 char max)
```
travel,trip planner,AI,itinerary,instagram,save,map,inspiration,clips,places
```

---

## 5. Screenshots (Required)

You need screenshots for:

| Device | Size |
|--------|------|
| iPhone 6.7" (iPhone 15 Pro Max) | 1290×2796 |
| iPhone 6.5" (iPhone 14 Plus) | 1284×2778 |
| iPhone 5.5" (iPhone 8 Plus) | 1242×2208 |
| iPad Pro 12.9" (if submitting as universal) | 2048×2732 |

Recommended screens to capture:
1. Map view with pinned locations
2. Inbox showing clip cards with substance badges
3. Location detail card open showing wisdom items
4. Plan view showing day accordion with sourced tips
5. Share Extension in action (requires device)

---

## 6. App Review Notes

Paste this into App Store Connect → "Notes for Review":

```
TravelPanel is a travel inspiration clipper and AI trip planner.

To test the core flow:
1. Open the app — demo boards with sample clips are loaded automatically.
2. Tap any pin on the map to see the detail card with AI-extracted wisdom.
3. Tap "Collections" → tap a board → tap "Plan this trip".
   An Anthropic API key is required for AI features — please enter one in
   Settings before generating a plan.

The iOS Share Extension requires adding the app to a device — it is not
testable in the simulator. The Share Extension appears in the iOS share sheet
for URLs and web pages.

API Key: The app requires an Anthropic Claude API key (obtained from
console.anthropic.com) to use AI extraction and planning features.
The app works without a key (saved clips remain, AI extraction is disabled).
```

---

## 7. TestFlight

Before external submission:
- ☐ Internal testing: add your team (up to 100 testers)
- ☐ Test on a real iPhone (Share Extension doesn't work in simulator)
- ☐ Verify GPS alert fires when within 300m of a saved spot (C1)
- ☐ Verify dark mode map switches style automatically
- ☐ Verify haptic feedback on pin tap and clip save

---

## 8. ATS (App Transport Security)

The app loads the Vercel-deployed Next.js web app. Confirm in Info.plist:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

This is required because Capacitor WebView loads the web app over HTTPS but
also makes requests to `api.anthropic.com` and `tiles.openfreemap.org`.

---

## 9. Final Build Checklist

- ☐ Increment build number in Xcode (Target → Build Settings → Current Project Version)
- ☐ `npm run build` passes without errors
- ☐ `npm run ios:build` syncs Capacitor
- ☐ Product → Archive in Xcode
- ☐ Validate App (Window → Organizer → Validate)
- ☐ Distribute App → App Store Connect → Upload
