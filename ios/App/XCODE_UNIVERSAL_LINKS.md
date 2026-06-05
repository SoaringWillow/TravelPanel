# Universal Links — Xcode Setup

## Prerequisites
- Xcode 15+
- Apple Developer account with App ID `com.travelpanel.app`
- App deployed to a domain (e.g. `your-app.vercel.app`)

## Step 1: Enable Associated Domains capability

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the **App** target → **Signing & Capabilities**
3. Click **+ Capability** → search for **Associated Domains** → add it
4. In the Associated Domains list, add:
   ```
   applinks:your-app.vercel.app
   ```
   Replace `your-app.vercel.app` with your actual deployed domain.

## Step 2: Verify the AASA file is served correctly

The `apple-app-site-association` file is at `public/apple-app-site-association`.
Vercel serves it automatically at:
```
https://your-app.vercel.app/apple-app-site-association
```

Update the `appID` inside the file to match your **Team ID** + Bundle ID:
```json
"appID": "XXXXXXXXXX.com.travelpanel.app"
```

Find your Team ID at: https://developer.apple.com/account (top-right)

## Step 3: Verify AppDelegate

`ios/App/App/AppDelegate.swift` already contains:
```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    return ApplicationDelegateProxy.shared.application(
        application, continue: userActivity, restorationHandler: restorationHandler)
}
```
This routes Universal Links through Capacitor's `appUrlOpen` event, which
`CapacitorBridge.tsx` already listens for and routes to the correct Next.js page.

## Covered paths

The following URL paths open the app directly when tapped on iOS:
- `/shared/*` → Shared board viewer
- `/boards/*` → Board detail
- `/plan/*` → Trip planner
- `/share` → Import sheet

## Testing

1. Build + run on a physical device (Universal Links don't work in Simulator)
2. Open Safari → type your-app.vercel.app/shared/someHash
3. A banner at the top of Safari should offer to open in TravelPanel
4. Tapping the banner routes you directly into the app
