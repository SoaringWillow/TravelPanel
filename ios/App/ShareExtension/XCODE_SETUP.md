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

## Step 6: Generate App Icons (one command)

```bash
# From the repo root — generates all iOS icon sizes (20×20 to 1024×1024)
node ios/App/App/Assets.xcassets/AppIcon.appiconset/generate.js
```

This creates `AppIcon-<size>@<scale>x.png` files + an updated `Contents.json` in the appiconset folder.
After running, in Xcode right-click `Assets.xcassets` → **Show in Finder** and drag the folder back into Xcode to refresh the asset catalog (or use Xcode → Product → Clean Build Folder, then rebuild).

The script requires no npm dependencies — pure Node.js with built-in zlib.

## Step 7: Build and test

1. Select the **App** scheme
2. Choose a simulator or device
3. **Product → Build** (`⌘B`)
4. Run the app
5. Open Safari, navigate to any page, tap **Share → Save to TravelPanel**
6. The Share Extension should appear and open TravelPanel
7. Verify the app icon appears correctly on the home screen (check the 1024×1024 AppStore icon too)

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
