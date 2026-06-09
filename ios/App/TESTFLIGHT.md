# TravelPanel — TestFlight Distribution Guide

## Prerequisites

- macOS 13+
- Xcode 15+
- Apple Developer account (paid, $99/year) — enroll at developer.apple.com
- CocoaPods: `sudo gem install cocoapods` (run once)
- Node.js 20+

## First-Time Xcode Setup

### 1. Install iOS dependencies

```bash
cd ios/App
pod install
```

### 2. Open the workspace (not the .xcodeproj)

```bash
npx cap open ios
# Or: open ios/App/App.xcworkspace
```

### 3. Configure signing

In Xcode:
1. Select the **App** target → **Signing & Capabilities**
2. Set **Team** to your Apple Developer account
3. Set **Bundle Identifier** to `com.travelpanel.app` (or your chosen ID)
4. Xcode should auto-manage provisioning profiles — leave "Automatically manage signing" checked

### 4. Share Extension signing (if using native share)

Repeat step 3 for the **ShareExtension** target. Both targets must use the same Team.
The Share Extension bundle ID must be `com.travelpanel.app.ShareExtension`.

See `ShareExtension/XCODE_SETUP.md` for full wiring instructions.

## Building for TestFlight

### Quick build (recommended)

```bash
# From the project root:
npm run build:ios
```

This runs `npm run build` → `npx cap sync ios` → opens Xcode.

### Manual steps in Xcode

1. Select **Any iOS Device (arm64)** as the target device (not a simulator)
2. **Product → Archive** — this compiles a release build and creates an archive
3. When the Organizer opens: select the archive → **Distribute App**
4. Choose **App Store Connect** → **Upload**
5. Follow the wizard (leave all defaults, Xcode handles signing)

### In App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select **TravelPanel** → **TestFlight** tab
3. Wait ~5 minutes for the build to process
4. Click the build → add internal testers (up to 100 with no review)
5. External testers (up to 10,000) require a brief Beta App Review

## App Store Connect Setup (one-time)

1. Create a new app: **My Apps → +**
2. Platform: iOS, Name: TravelPanel, Bundle ID: `com.travelpanel.app`
3. SKU: `travelpanel-v1`
4. Under **App Information**: fill in category (Travel), age rating, privacy policy URL (`https://your-app.vercel.app/privacy`)

## Required Screenshots

Apple requires screenshots for at minimum two device sizes:

| Device | Size |
|--------|------|
| iPhone 15 Pro Max (6.7") | 1290 × 2796 px |
| iPhone 8 Plus (5.5") | 1242 × 2208 px |

Capture these in the Xcode Simulator (Device → Screenshot) or on a real device.

## Environment Variables for Production Build

Ensure these are set in Vercel (or your hosting provider) before building:

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude AI extraction |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Analytics |
| `RESEND_API_KEY` | Optional | Email notifications |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Cloud sync (Phase B) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Cloud sync (Phase B) |

## Capacitor Config

The production server URL is set in `capacitor.config.ts`. For TestFlight:

```typescript
server: {
  url: 'https://your-app.vercel.app',  // Your Vercel deployment URL
  cleartext: false,
}
```

For local development testing on a physical device:
```typescript
server: {
  url: 'http://192.168.1.100:3000',  // Your Mac's local IP
  cleartext: true,
}
```

## Troubleshooting

**"No provisioning profile" error**
→ In Xcode: Preferences → Accounts → download manually, or re-check Automatically manage signing

**"App ID not registered" error**
→ Register the bundle ID at developer.apple.com → Identifiers → +

**Build succeeds but app crashes on launch**
→ Check that the Vercel URL in `capacitor.config.ts` matches your actual deployment

**Share Extension not appearing in iOS Share Sheet**
→ Review `ShareExtension/XCODE_SETUP.md` — the App Group entitlement must match
