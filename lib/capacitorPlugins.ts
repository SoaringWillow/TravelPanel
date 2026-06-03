// TypeScript client for the TravelPanelBridgePlugin native Capacitor plugin.
// The plugin reads/clears App Group data written by the iOS Share Extension.
//
// XCODE SETUP REQUIRED (one-time):
//   1. In Xcode, right-click App/Plugins group → "Add Files to App"
//   2. Select ios/App/App/Plugins/TravelPanelBridge/ folder (check "Copy items if needed")
//   3. Ensure both .swift and .m files are added to the App target
//   4. Build once — Capacitor auto-discovers @objc(TravelPanelBridgePlugin)
//
// No package.json or npm install needed — this is a local inline plugin.

import { registerPlugin } from '@capacitor/core';

export interface AppGroupData {
  pendingShareURL?: string;
  pendingShareTitle?: string;
  pendingShareImage?: string; // base64-encoded JPEG
}

export interface TravelPanelBridgePlugin {
  readAppGroupData(): Promise<AppGroupData>;
  clearAppGroupData(): Promise<void>;
}

export const TravelPanelBridge = registerPlugin<TravelPanelBridgePlugin>(
  'TravelPanelBridge',
  {
    web: {
      // Web fallback — reads from @capacitor/preferences (written by Share Extension URL scheme path)
      async readAppGroupData(): Promise<AppGroupData> {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          const [{ value: url }, { value: title }] = await Promise.all([
            Preferences.get({ key: 'pendingShareURL' }),
            Preferences.get({ key: 'pendingShareTitle' }),
          ]);
          return {
            pendingShareURL: url ?? undefined,
            pendingShareTitle: title ?? undefined,
          };
        } catch {
          return {};
        }
      },
      async clearAppGroupData(): Promise<void> {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Promise.all([
            Preferences.remove({ key: 'pendingShareURL' }),
            Preferences.remove({ key: 'pendingShareTitle' }),
          ]);
        } catch { /* noop */ }
      },
    },
  }
);
