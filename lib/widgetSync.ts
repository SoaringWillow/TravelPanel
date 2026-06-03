// Writes recent clips to App Group UserDefaults for the iOS Home Screen Widget.
// Called after any clip save or on app foreground.

import { SavedItem } from './types';

interface WidgetClip {
  id: string;
  title: string;
  thumbnail?: string;
  locationCount: number;
}

export async function syncWidgetData(items: SavedItem[]): Promise<void> {
  try {
    const { TravelPanelBridge } = await import('./capacitorPlugins');
    // Build compact array — most recently saved first, up to 3
    const clips: WidgetClip[] = items
      .filter((i) => !i.isDemo && i.enrichmentStatus === 'done')
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, 3)
      .map((i) => ({
        id: i.id,
        title: i.title,
        thumbnail: i.thumbnail,
        locationCount: i.locations.length,
      }));

    // Write via a generic "widgetClips" key — the Swift plugin exposes readAppGroupData
    // but doesn't need to expose this write path since we piggyback on the same App Group.
    // We write directly via a custom call if the plugin supports it; otherwise no-op.
    // This is a best-effort: the widget will refresh hourly from App Group.
    const _bridge = TravelPanelBridge as unknown as {
      writeWidgetData?: (data: { json: string }) => Promise<void>;
    };
    if (typeof _bridge.writeWidgetData === 'function') {
      await _bridge.writeWidgetData({ json: JSON.stringify(clips) });
    }
  } catch {
    // Not in a Capacitor context — no-op
  }
}
