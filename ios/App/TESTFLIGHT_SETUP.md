# TravelPanel — TestFlight Beta Setup

## Prerequisites

- Apple Developer Account ($99/year) at [developer.apple.com](https://developer.apple.com)
- Xcode 15+ installed on macOS
- App ID and Bundle ID created in the Developer portal
- CocoaPods installed: `sudo gem install cocoapods`

---

## 1. App Store Connect — Create the App

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps → +  → New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: TravelPanel
   - **Primary Language**: English
   - **Bundle ID**: `com.travelpanel.app` (must match `capacitor.config.ts`)
   - **SKU**: `travelpanel-ios-001`
4. Click **Create**

---

## 2. Signing — Certificates & Provisioning

### 2a. Create a Distribution Certificate

1. Xcode → Settings → Accounts → select your Apple ID
2. Click **Manage Certificates** → **+** → **Apple Distribution**
3. Xcode creates and downloads the certificate automatically

### 2b. Register the App ID (if not done)

1. Developer portal → Identifiers → **+**
2. Select **App IDs** → **App**
3. Bundle ID: `com.travelpanel.app` (Explicit)
4. Enable capabilities:
   - **App Groups**: `group.com.travelpanel.app`
   - **Push Notifications** (for future use)
5. Register

### 2c. Configure Signing in Xcode

1. Open `ios/App/App.xcworkspace` (not .xcodeproj!)
2. Select the **App** target → **Signing & Capabilities**
3. Check **Automatically manage signing**
4. Team: your Apple Developer team
5. Bundle Identifier: `com.travelpanel.app`
6. Repeat for the **ShareExtension** target

---

## 3. Build for Distribution

### 3a. Sync the web app

```bash
# From the project root — update your Vercel URL first
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build
```

### 3b. Archive in Xcode

1. Select **Any iOS Device (arm64)** as destination (not a simulator)
2. Menu: **Product → Archive**
3. Wait for the archive to complete (~2-5 min)
4. The Organizer window opens automatically

### 3c. Upload to App Store Connect

1. In Organizer, select the archive → **Distribute App**
2. Select **App Store Connect**
3. Select **Upload**
4. Choose distribution options:
   - ✅ Include bitcode: No (Capacitor apps don't need it)
   - ✅ Upload your app's symbols: Yes
5. Click **Upload**
6. Wait for processing (~10-30 min)

---

## 4. TestFlight — Internal Testing

1. In App Store Connect → Your App → **TestFlight**
2. Under **Internal Testing**, click **+** next to "Internal Testers"
3. Add Apple IDs of internal testers (must be added to your team in App Store Connect → Users and Access)
4. The build appears under "Builds" — wait for "Ready to Test" status
5. Add the build to the internal test group
6. Testers receive an email invitation to install via TestFlight

**Note**: Internal testing allows up to 100 testers with no review required.

---

## 5. TestFlight — External Testing

1. Go to **TestFlight → External Testing → +**
2. Create a group (e.g., "Beta Testers")
3. Add the build to the group
4. Apple reviews the build for basic guidelines (~24 hours)
5. Once approved, add up to **10,000 external testers** by email or link

### Review Notes for Beta
Include these notes when submitting for external review:
```
This app uses:
- iOS Share Extension (NSExtension) to receive shared URLs
- App Group (group.com.travelpanel.app) for data sharing between extension and main app
- Location Services (GPS) only in navigation mode, not in background
- Anthropic API for AI-powered travel extraction (API key is server-side)
```

---

## 6. Crash Monitoring & Feedback

- TestFlight automatically collects crash reports (visible in Xcode Organizer → Crashes)
- Beta users can submit feedback via the TestFlight app (screenshot → send feedback)
- To view feedback: App Store Connect → Your App → TestFlight → Feedback

---

## 7. Common Issues

### "Missing compliance" error
- In Info.plist, add `ITSAppUsesNonExemptEncryption = NO` (the app uses only HTTPS)

### "Archive fails to upload"
- Check that both targets (App + ShareExtension) have valid provisioning profiles
- Try: Xcode → Product → Clean Build Folder, then re-archive

### "App Group not working"
- Both targets must have the same App Group in Signing & Capabilities
- In the Developer portal, the App Group `group.com.travelpanel.app` must be registered

### "Share Extension doesn't appear"
- ShareExtension target must have the correct NSExtension configuration
- See `ios/App/ShareExtension/XCODE_SETUP.md` for wiring instructions

---

## 8. Promote to App Store

When beta testing is complete:

1. App Store Connect → Your App → **App Store** tab
2. Fill in metadata (see `APPSTORE_METADATA.md`)
3. Upload screenshots (see metadata file for size specs)
4. Select the TestFlight build
5. **Submit for Review**
6. Apple review takes 1-3 business days

---

## Quick Reference

| Task | Command / Location |
|---|---|
| Sync web → native | `npm run ios:build` |
| Open in Xcode | `npm run ios:open` |
| Generate app icons | `npm run app:icons` |
| View crash logs | Xcode → Organizer → Crashes |
| App Store Connect | appstoreconnect.apple.com |
| Developer Portal | developer.apple.com |
