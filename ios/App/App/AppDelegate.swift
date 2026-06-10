import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Holds the base64-encoded image from the Share Extension until the web view is ready
    private var pendingShareImageBase64: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Inject any pending share image that arrived while the app was in the background
        injectPendingShareImageIfNeeded()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Read any pending screenshot from the App Group BEFORE handing off to Capacitor,
        // so the web view global is set before the /share page mounts.
        preparePendingShareImage()

        let result = ApplicationDelegateProxy.shared.application(app, open: url, options: options)

        // Inject with a short delay to allow client-side navigation to /share to complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.injectPendingShareImageIfNeeded()
        }

        return result
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // ── Image bridge ──────────────────────────────────────────────────────────

    /// Reads the pending screenshot from the App Group container into memory.
    private func preparePendingShareImage() {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app"),
              defaults.bool(forKey: "pendingShareHasImage"),
              let containerURL = FileManager.default.containerURL(
                  forSecurityApplicationGroupIdentifier: "group.com.travelpanel.app"
              )
        else { return }

        let fileURL = containerURL.appendingPathComponent("shareImage.jpg")
        guard let data = try? Data(contentsOf: fileURL), !data.isEmpty else { return }

        pendingShareImageBase64 = data.base64EncodedString()

        // Clean up so we don't re-inject on the next app open
        defaults.removeObject(forKey: "pendingShareHasImage")
        defaults.synchronize()
        try? FileManager.default.removeItem(at: fileURL)
    }

    /// Injects the pending image into the Capacitor web view as a global variable.
    /// The share page reads `window.__pendingShareImage` on mount.
    private func injectPendingShareImageIfNeeded() {
        guard let base64 = pendingShareImageBase64,
              let capVC = window?.rootViewController as? CAPBridgeViewController
        else { return }

        pendingShareImageBase64 = nil

        // Escape single quotes in base64 (shouldn't occur, but defensive)
        let escaped = base64.replacingOccurrences(of: "'", with: "\\'")
        let js = "window.__pendingShareImage = '\(escaped)';"

        capVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}
