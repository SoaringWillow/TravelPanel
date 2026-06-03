// Siri Shortcuts — "Clip Current URL" / "Open TravelPanel"
//
// XCODE SETUP (one-time):
//   1. Select the App target → Signing & Capabilities → + Capability → Siri
//   2. Add "NSUserActivityTypes" array to Info.plist with value "com.travelpanel.clip"
//   3. Call SiriShortcuts.donateClipShortcut() after each successful clip save
//   4. The user can then add the shortcut via Settings → Siri & Search
//      or Shortcuts app: "Hey Siri, clip this to TravelPanel"
//
// The shortcut opens the app with the URL pre-filled via the URL scheme:
//   travelpanel://share?url=<url>

import Foundation
import Intents
import UIKit

@available(iOS 12.0, *)
enum SiriShortcuts {

    static let activityType = "com.travelpanel.clip"

    // Call this after each successful clip save to teach Siri the pattern.
    static func donateClipShortcut(url: String, title: String) {
        let activity = NSUserActivity(activityType: activityType)
        activity.title = "Clip \"\(title)\" to TravelPanel"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = NSUserActivityPersistentIdentifier(url)
        activity.userInfo = ["url": url, "title": title]

        // Suggest the shortcut phrase
        let shortcut = INShortcut(userActivity: activity)
        let interaction = INInteraction(intent: INIntent(), response: nil)
        _ = shortcut // keep reference alive

        INVoiceShortcutCenter.shared.getAllVoiceShortcuts { existing, _ in
            // Avoid duplicates
            if existing?.contains(where: { $0.shortcut.userActivity?.persistentIdentifier?.absoluteString == url }) == true {
                return
            }
        }
    }

    // Present the "Add to Siri" sheet from the app's settings screen.
    static func presentAddToSiri(from viewController: UIViewController, url: String, title: String) {
        let activity = NSUserActivity(activityType: activityType)
        activity.title = title
        activity.userInfo = ["url": url]

        let shortcut = INShortcut(userActivity: activity)
        let vc = INUIAddVoiceShortcutViewController(shortcut: shortcut)
        viewController.present(vc, animated: true)
    }
}
