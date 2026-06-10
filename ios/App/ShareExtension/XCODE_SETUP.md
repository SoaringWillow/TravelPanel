# Share Extension — Xcode Setup

The Swift files in this directory are ready. Complete the Xcode wiring by following these steps on a Mac.

## Prerequisites

- Xcode 15+
- Apple Developer account (free or paid)
- CocoaPods: `sudo gem install cocoapods`

## Step 1: Install iOS dependencies

```bash
cd ios/App
pod install
```

Then open `App.xcworkspace` (not `.xcodeproj`).

## Step 2: Add the Share Extension target

1. In Xcode, select **File → New → Target**
2. Choose **Share Extension** under iOS
3. Name it **ShareExtension**
4. Bundle Identifier: `com.travelpanel.app.ShareExtension`
5. Do **NOT** activate the scheme when prompted (keep the App scheme active)
6. Xcode creates a default `ShareViewController.swift` — **delete it**
7. Drag `ios/App/ShareExtension/ShareViewController.swift` into the new target
8. Drag `ios/App/ShareExtension/Info.plist` over the one Xcode generated, replacing it

## Step 3: Configure App Groups (for the fallback path)

App Groups allow the Share Extension and the main app to share a `UserDefaults` container. This is the fallback when the URL scheme open isn't available.

### Main App target:
1. Select the **App** target → **Signing & Capabilities**
2. Click **+ Capability** → **App Groups**
3. Add group: `group.com.travelpanel.app`

### ShareExtension target:
1. Select the **ShareExtension** target → **Signing & Capabilities**
2. Click **+ Capability** → **App Groups**
3. Add the same group: `group.com.travelpanel.app`

## Step 4: Configure Build Settings for ShareExtension

Select the **ShareExtension** target → **Build Settings**:

| Setting | Value |
|---|---|
| iOS Deployment Target | 16.0 |
| Swift Language Version | Swift 5 |
| Product Bundle Identifier | com.travelpanel.app.ShareExtension |

## Step 5: Add URL scheme to main App

Already done in `ios/App/App/Info.plist` — the `travelpanel://` scheme is registered. Verify it appears in the main **App** target → **Info** tab → **URL Types**.

## Step 6: Build and test

1. Select the **App** scheme
2. Choose a simulator or device
3. **Product → Build** (`⌘B`)
4. Run the app
5. Open Safari, navigate to any page, tap **Share → Save to TravelPanel**
6. The Share Extension should appear and open TravelPanel

## Development workflow

```bash
# Point Capacitor at your local dev server (replace with your Mac's local IP)
CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npm run dev &
CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npm run ios:sync
# Then build and run from Xcode
```

## Production build

```bash
# Set to your deployed Vercel URL
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build
# Then archive from Xcode: Product → Archive
```

## Step 7: Add Privacy Manifest (required for App Store)

Apple requires a privacy manifest for all new submissions since May 2024.

The file `ios/App/App/PrivacyInfo.xcprivacy` is already created. Add it to the Xcode project:

1. In Xcode, right-click the **App** folder (blue folder icon, not the group)
2. Select **Add Files to "App"...**
3. Navigate to `ios/App/App/PrivacyInfo.xcprivacy` and click **Add**
4. Ensure **"App" target** checkbox is checked, NOT ShareExtension
5. Verify it appears in the **App** target → **Build Phases → Copy Bundle Resources**

The privacy manifest declares:
- `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1): used by the Share Extension for App Group fallback
- No advertising tracking (`NSPrivacyTracking: false`)

If you add PostHog analytics, update `NSPrivacyCollectedDataTypes` to include anonymous usage analytics.
