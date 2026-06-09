import UIKit
import Capacitor

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
        // When the Share Extension includes an image (hasImage=1), AppDelegate reads
        // the base64 JPEG from the App Group and injects it into the WebView's
        // localStorage as 'pendingShareImage' for the share page to pick up.
        if url.scheme == "travelpanel",
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           components.queryItems?.contains(where: { $0.name == "hasImage" && $0.value == "1" }) == true {
            // Delay slightly — the URL scheme fires before the React share page renders.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                self.injectPendingShareImage()
            }
        }

        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // ── Vision image injection ────────────────────────────────────────────────

    private func injectPendingShareImage() {
        guard let defaults = UserDefaults(suiteName: "group.com.travelpanel.app"),
              let base64 = defaults.string(forKey: "pendingShareImageBase64") else { return }

        defaults.removeObject(forKey: "pendingShareImageBase64")
        defaults.synchronize()

        // Capacitor's root view controller exposes the WKWebView.
        guard let bridgeVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = bridgeVC.webView else { return }

        // base64 only contains A-Za-z0-9+/= — no escaping needed.
        let js = "localStorage.setItem('pendingShareImage', '\(base64)');"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
