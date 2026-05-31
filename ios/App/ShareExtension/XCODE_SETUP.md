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

---

## App Icon & Launch Screen Setup

### App Icon

The icon is pre-generated and placed at:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

This single 1024×1024 PNG satisfies all modern iOS icon requirements. Xcode 14+ supports
a "universal" single-image app icon — no need to specify individual sizes.

Verify in Xcode:
1. Open **Assets.xcassets** → **AppIcon**
2. You should see the indigo map-pin icon in the "iOS" slot
3. If it shows as empty: drag `AppIcon-512@2x.png` into the 1024×1024 slot

To regenerate icons (e.g. after design changes):
```bash
node scripts/generate-app-icons.js
```

### Launch Screen

The launch screen storyboard at `ios/App/App/Base.lproj/LaunchScreen.storyboard` is
configured to show the `Splash` image asset centered on an indigo (#6366f1) background.

Pre-generated splash images are at:
```
ios/App/App/Assets.xcassets/Splash.imageset/
  splash-2732x2732.png      (3× scale)
  splash-2732x2732-1.png    (2× scale)
  splash-2732x2732-2.png    (1× scale)
```

Each shows the indigo gradient background with the white map-pin centered. Because the
storyboard uses `contentMode="center"`, the pin renders at its natural size regardless
of device screen dimensions.

No Xcode changes required — the storyboard and image assets are already wired.
