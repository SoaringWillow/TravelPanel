import Foundation
import Capacitor

// Capacitor plugin that reads pending share data (including image) from the
// shared App Group UserDefaults written by ShareViewController.
// Registration: see AppGroupPlugin.m (CAP_PLUGIN macro).

@objc(AppGroupPlugin)
public class AppGroupPlugin: CAPPlugin {

    private let appGroupId = "group.com.travelpanel.app"

    // Returns the base64-encoded JPEG that ShareViewController stored before
    // opening the app via URL scheme, then clears it.
    @objc func readPendingImage(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            call.resolve(["imageBase64": ""])
            return
        }

        let imageBase64 = defaults.string(forKey: "pendingShareImageBase64") ?? ""
        defaults.removeObject(forKey: "pendingShareImageBase64")
        defaults.synchronize()

        call.resolve(["imageBase64": imageBase64])
    }
}
