/**
 * Writes a compact widget payload to the App Group shared storage
 * so a native iOS WidgetKit extension can display the latest clips
 * without opening the main app.
 *
 * The native widget target (ios/App/TravelWidget/) reads the key
 * 'widgetData' from UserDefaults(suiteName: "group.com.travelpanel.app").
 *
 * See ios/App/TravelWidget/WIDGET_SETUP.md for Xcode setup instructions.
 */

import { SavedItem } from '@/lib/types';

export interface WidgetClip {
  id: string;
  title: string;
  locationName?: string;
}

export interface WidgetPayload {
  clips: WidgetClip[];
  updatedAt: number;
}

export async function pushWidgetData(items: SavedItem[]): Promise<void> {
  // Only items that are enriched and have a title
  const enriched = items
    .filter((i) => i.enrichmentStatus === 'done' && i.title && i.title !== i.url)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 3);

  const payload: WidgetPayload = {
    clips: enriched.map((i) => ({
      id: i.id,
      title: i.title ?? '',
      locationName: i.locations[0]?.name,
    })),
    updatedAt: Date.now(),
  };

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key: 'widgetData',
      value: JSON.stringify(payload),
    });
  } catch {
    // Capacitor not available (web) — write to localStorage as fallback
    try {
      localStorage.setItem('widgetData', JSON.stringify(payload));
    } catch {
      // ignore
    }
  }
}
