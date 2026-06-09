# TravelPanel — iOS Release Guide

## Prerequisites

- macOS with Xcode 15+
- CocoaPods: `sudo gem install cocoapods`
- Node.js 18+
- Vercel deployment URL (production builds only)

## First-time Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Install iOS CocoaPods dependencies
cd ios/App && pod install && cd ../..
```

## Development Build (live reload)

The app shell loads from your local Next.js dev server.

```bash
# Terminal 1 — start Next.js dev server
npm run dev

# Terminal 2 — replace 192.168.x.x with your Mac's local IP
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npm run ios:dev
```

This opens Xcode. Select your connected device or simulator and press Run.

## Production Build (App Store)

```bash
# 1. Deploy to Vercel (or your host)
vercel --prod

# 2. Sync with production URL
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build

# 3. In Xcode: Product → Archive → Distribute App
```

## Share Extension Wiring (first time only)

See `ios/App/ShareExtension/XCODE_SETUP.md` for the full Xcode setup.
Required for the iOS Share Sheet to work.

## Required Xcode Project Settings

| Setting | Value |
|---|---|
| Bundle ID | `com.travelpanel.app` |
| Deployment Target | iOS 15.0+ |
| App Group | `group.com.travelpanel.app` |
| Capabilities | App Groups, Location When In Use |

## Info.plist Permissions

Already configured in `ios/App/App/Info.plist`:
- `NSLocationWhenInUseUsageDescription` — GPS nearby mode
- `NSLocationAlwaysAndWhenInUseUsageDescription` — proximity alerts
- `NSCameraUsageDescription` — camera capture
- `NSPhotoLibraryUsageDescription` — photo library access

## App Store Metadata

- **Name**: TravelPanel
- **Category**: Travel
- **Subtitle**: Save. Plan. Explore.
- **Keywords**: travel, trip planner, AI, save, inspiration, maps, itinerary

## Version History

| Version | Build | Notes |
|---|---|---|
| 0.1 | 1 | Initial release — clip + AI plan |
