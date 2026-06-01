import UIKit
import Capacitor

// Capacitor Preferences plugin stores values as plain strings in UserDefaults.standard
// with a "cap_prefs_" key prefix. We use that same prefix so CapacitorBridge can
// read the image via @capacitor/preferences without a custom native plugin.
private let capPrefsPrefix = "cap_prefs_"
private let appGroupId     = "group.com.travelpanel.app"

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // B3: when the Share Extension wrote an image to the App Group, bridge it
        // into standard UserDefaults so @capacitor/preferences can read it.
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           components.queryItems?.contains(where: { $0.name == "hasImage" && $0.value == "true" }) == true {
            bridgeImageFromAppGroup()
        }

        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // ── App Group → UserDefaults.standard bridge ──────────────────────────────

    // Reads pending image data written by the Share Extension from the App Group
    // and copies it into UserDefaults.standard with the Capacitor Preferences prefix.
    // CapacitorBridge then reads it via @capacitor/preferences and clears it.
    private func bridgeImageFromAppGroup() {
        guard let appGroup = UserDefaults(suiteName: appGroupId),
              let base64 = appGroup.string(forKey: "pendingShareImage") else { return }

        let mime     = appGroup.string(forKey: "pendingShareImageMime") ?? "image/jpeg"
        let imgURL   = appGroup.string(forKey: "pendingShareImageURL")
        let imgTitle = appGroup.string(forKey: "pendingShareImageTitle")

        // Write to standard UserDefaults with Capacitor prefix so @capacitor/preferences can read them
        let std = UserDefaults.standard
        std.set(base64, forKey: capPrefsPrefix + "pendingShareImage")
        std.set(mime,   forKey: capPrefsPrefix + "pendingShareImageMime")
        if let u = imgURL   { std.set(u, forKey: capPrefsPrefix + "pendingShareImageURL") }
        if let t = imgTitle { std.set(t, forKey: capPrefsPrefix + "pendingShareImageTitle") }
        std.synchronize()

        // Clear from App Group so it isn't replayed on the next launch
        appGroup.removeObject(forKey: "pendingShareImage")
        appGroup.removeObject(forKey: "pendingShareImageMime")
        appGroup.removeObject(forKey: "pendingShareImageURL")
        appGroup.removeObject(forKey: "pendingShareImageTitle")
        appGroup.synchronize()
    }
}
