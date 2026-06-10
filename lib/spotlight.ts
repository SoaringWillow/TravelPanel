// iOS Core Spotlight integration via Capacitor.
//
// The native plugin required is @capacitor-community/apple-search-api, which
// must be added to the Xcode project manually (it is not published to npm).
// Installation:
//   npm install github:capacitor-community/apple-search-api
//   npx cap sync ios
// See: https://github.com/capacitor-community/apple-search-api
//
// All calls no-op silently when the plugin or the iOS platform is unavailable,
// so this file is safe to import on web and Android.

interface SpotlightItem {
  uniqueIdentifier: string;
  domain: string;
  title: string;
  description?: string;
  thumbnailURL?: string;
  keywords?: string[];
}

async function getPlugin() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core');
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return null;

    const mod = await import('@capacitor-community/apple-search-api' as string);
    return (mod as { AppleSearchApi?: unknown }).AppleSearchApi ?? null;
  } catch {
    return null;
  }
}

export async function indexClip(item: {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
}): Promise<void> {
  try {
    const plugin = await getPlugin();
    if (!plugin || typeof (plugin as Record<string, unknown>).indexItems !== 'function') return;

    const entry: SpotlightItem = {
      uniqueIdentifier: item.id,
      domain: 'clips',
      title: item.title,
      description: item.description,
      thumbnailURL: item.thumbnail,
      keywords: item.tags,
    };

    await (plugin as { indexItems: (items: SpotlightItem[]) => Promise<void> }).indexItems([entry]);
  } catch {}
}

export async function deindexClip(id: string): Promise<void> {
  try {
    const plugin = await getPlugin();
    if (!plugin || typeof (plugin as Record<string, unknown>).deleteItemsWithIdentifiers !== 'function') return;

    await (plugin as { deleteItemsWithIdentifiers: (ids: string[]) => Promise<void> }).deleteItemsWithIdentifiers([id]);
  } catch {}
}
