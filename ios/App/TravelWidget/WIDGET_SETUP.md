# TravelWidget — iOS Home Screen Widget Setup

This document describes how to add the WidgetKit home screen widget to the Xcode project.

## What the widget shows

- Last 3 saved clips (title + first location name)
- Fallback: "Add your first clip" prompt when inbox is empty
- Indigo gradient background with globe emoji
- Taps deep-link into the app

## Data flow

1. `lib/widgetData.ts` writes a `widgetData` JSON key to App Group `group.com.travelpanel.app` via `@capacitor/preferences` whenever a clip finishes enriching.
2. The native widget extension reads that key from `UserDefaults(suiteName:)` and displays the clips.

## Xcode setup steps

### 1. Add the Widget Extension target

1. In Xcode, go to **File → New → Target**
2. Choose **Widget Extension**
3. Name it `TravelWidget`
4. Product Name: `TravelWidget`
5. Bundle Identifier: `com.travelpanel.app.TravelWidget`
6. Uncheck "Include Configuration Intent" (we use a simple static widget)
7. Click **Finish**, then **Activate** the scheme when prompted

### 2. Add the widget to the App Group

1. Select the **TravelWidget** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → **App Groups**
4. Add `group.com.travelpanel.app` (same group as the main app and Share Extension)

### 3. Write the Timeline Provider (Swift)

Create `TravelWidget/TravelWidgetProvider.swift`:

```swift
import WidgetKit
import SwiftUI

struct WidgetClip: Codable {
    let id: String
    let title: String
    let locationName: String?
}

struct WidgetPayload: Codable {
    let clips: [WidgetClip]
    let updatedAt: Double
}

struct TravelEntry: TimelineEntry {
    let date: Date
    let clips: [WidgetClip]
}

struct TravelWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TravelEntry {
        TravelEntry(date: .now, clips: [
            WidgetClip(id: "1", title: "Tsukiji Outer Market", locationName: "Tokyo"),
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (TravelEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TravelEntry>) -> Void) {
        let entry = loadEntry()
        // Refresh after 1 hour
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadEntry() -> TravelEntry {
        let defaults = UserDefaults(suiteName: "group.com.travelpanel.app")
        guard
            let raw = defaults?.string(forKey: "widgetData"),
            let data = raw.data(using: .utf8),
            let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data)
        else {
            return TravelEntry(date: .now, clips: [])
        }
        return TravelEntry(date: .now, clips: payload.clips)
    }
}
```

### 4. Write the Widget View (SwiftUI)

Create `TravelWidget/TravelWidgetView.swift`:

```swift
import SwiftUI
import WidgetKit

struct TravelWidgetView: View {
    let entry: TravelEntry

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#6366f1"), Color(hex: "#8b5cf6")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if entry.clips.isEmpty {
                VStack(spacing: 6) {
                    Text("🌐").font(.largeTitle)
                    Text("Add your first clip").font(.caption).foregroundColor(.white.opacity(0.8))
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("🌐 TravelPanel")
                        .font(.caption2).bold()
                        .foregroundColor(.white.opacity(0.7))

                    ForEach(entry.clips.prefix(3), id: \.id) { clip in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(clip.title)
                                .font(.caption).bold()
                                .foregroundColor(.white)
                                .lineLimit(1)
                            if let loc = clip.locationName {
                                Text("📍 \(loc)")
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .widgetURL(URL(string: "travelpanel://open"))
    }
}

@main
struct TravelWidget: Widget {
    let kind = "TravelWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TravelWidgetProvider()) { entry in
            TravelWidgetView(entry: entry)
        }
        .configurationDisplayName("TravelPanel")
        .description("See your latest saved places.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Helper: hex color
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
```

### 5. Configure Info.plist

The widget target's `Info.plist` is auto-generated by Xcode. No manual changes needed.

### 6. Verify deep link handling

The widget taps open `travelpanel://open` which is already handled by `AppDelegate.swift`.
Make sure the URL scheme `travelpanel` is registered in the main app's `Info.plist`.

## Testing

1. Build and run the app on a real device (widgets don't work in Simulator)
2. Long-press the home screen → tap +
3. Search "TravelPanel" and add the widget
4. Save a clip in the app — within ~60s the widget should update
