// TravelPanel Home Screen Widget
//
// XCODE SETUP (one-time):
//   1. File → New → Target → Widget Extension
//   2. Name it "TravelPanelWidget", bundle ID: com.travelpanel.app.widget
//   3. Add App Group capability (group.com.travelpanel.app) — same as main app
//   4. Replace generated WidgetBundle code with this file
//   5. Build and run — widget appears in the widget gallery
//
// The widget reads recent clips written by the main app via App Group UserDefaults.
// Key: "widgetClips" — JSON array of { id, title, thumbnail, locationCount }

import WidgetKit
import SwiftUI

// ─── Model ───────────────────────────────────────────────────────────────────

struct WidgetClip: Codable, Identifiable {
    let id: String
    let title: String
    let thumbnail: String? // URL string
    let locationCount: Int
}

struct WidgetEntry: TimelineEntry {
    let date: Date
    let clips: [WidgetClip]
}

// ─── Provider ────────────────────────────────────────────────────────────────

struct TravelPanelProvider: TimelineProvider {
    private let appGroup = "group.com.travelpanel.app"

    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), clips: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        completion(WidgetEntry(date: Date(), clips: loadClips()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let entry = WidgetEntry(date: Date(), clips: loadClips())
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadClips() -> [WidgetClip] {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.data(forKey: "widgetClips"),
              let clips = try? JSONDecoder().decode([WidgetClip].self, from: data)
        else { return [] }
        return Array(clips.prefix(3))
    }
}

// ─── Views ───────────────────────────────────────────────────────────────────

struct SmallWidgetView: View {
    let clips: [WidgetClip]

    var body: some View {
        Link(destination: URL(string: "travelpanel://")!) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.indigo)
                        .font(.system(size: 12, weight: .semibold))
                    Text("TravelPanel")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.indigo)
                }
                if clips.isEmpty {
                    Text("No clips yet")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("Tap to add clips")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                } else {
                    Text("\(clips.count) clip\(clips.count != 1 ? "s" : "") saved")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.primary)
                    Spacer()
                    Text(clips[0].title)
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color(.systemBackground))
        }
    }
}

struct MediumWidgetView: View {
    let clips: [WidgetClip]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(clips.prefix(2)) { clip in
                Link(destination: URL(string: "travelpanel://")!) {
                    VStack(alignment: .leading, spacing: 4) {
                        if let thumb = clip.thumbnail, let url = URL(string: thumb) {
                            AsyncImage(url: url) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Color.indigo.opacity(0.15)
                            }
                            .frame(height: 60)
                            .clipped()
                        } else {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.indigo.opacity(0.15))
                                .frame(height: 60)
                        }
                        Text(clip.title)
                            .font(.system(size: 9, weight: .medium))
                            .lineLimit(2)
                            .foregroundColor(.primary)
                        if clip.locationCount > 0 {
                            Label("\(clip.locationCount) place\(clip.locationCount != 1 ? "s" : "")", systemImage: "mappin")
                                .font(.system(size: 8))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
                if clips.count > 1 && clip.id == clips.first?.id {
                    Divider()
                }
            }
        }
        .background(Color(.systemBackground))
    }
}

// ─── Widget definition ────────────────────────────────────────────────────────

struct TravelPanelWidget: Widget {
    let kind = "TravelPanelWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TravelPanelProvider()) { entry in
            if entry.clips.count >= 2 {
                MediumWidgetView(clips: entry.clips)
            } else {
                SmallWidgetView(clips: entry.clips)
            }
        }
        .configurationDisplayName("TravelPanel")
        .description("Your most recent travel inspiration clips.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct TravelPanelWidgetBundle: WidgetBundle {
    var body: some Widget {
        TravelPanelWidget()
    }
}
