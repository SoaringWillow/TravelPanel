import Foundation
import Capacitor

// App Group identifier — must match ShareExtension/ShareViewController.swift
private let APP_GROUP = "group.com.travelpanel.app"

@objc(TravelPanelBridgePlugin)
public class TravelPanelBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TravelPanelBridgePlugin"
    public let jsName = "TravelPanelBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "readAppGroupData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearAppGroupData", returnType: CAPPluginReturnPromise),
    ]

    @objc func readAppGroupData(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
            call.reject("App Group not available")
            return
        }

        var result: [String: Any] = [:]

        if let url = defaults.string(forKey: "pendingShareURL"), !url.isEmpty {
            result["pendingShareURL"] = url
        }
        if let title = defaults.string(forKey: "pendingShareTitle"), !title.isEmpty {
            result["pendingShareTitle"] = title
        }
        if let image = defaults.string(forKey: "pendingShareImage"), !image.isEmpty {
            // Only return image if it was written recently (within 1 hour)
            let date = defaults.double(forKey: "pendingShareImageDate")
            if date > 0 && Date().timeIntervalSince1970 - date < 3600 {
                result["pendingShareImage"] = image
            }
        }

        call.resolve(result)
    }

    @objc func clearAppGroupData(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
            call.reject("App Group not available")
            return
        }
        defaults.removeObject(forKey: "pendingShareURL")
        defaults.removeObject(forKey: "pendingShareTitle")
        defaults.removeObject(forKey: "pendingShareImage")
        defaults.removeObject(forKey: "pendingShareImageDate")
        call.resolve()
    }
}
