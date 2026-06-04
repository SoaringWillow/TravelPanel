'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending clip written by the native board picker (D12 Share Extension).
// The extension writes pendingClipURL/Title/BoardId to App Group and closes without
// opening the app — no WebView cold-start. We process it silently on next foreground.
async function checkPendingNativeClip() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingClipURL' });
    if (!url) return;

    const [{ value: title }, { value: boardId }, { value: image }, { value: imageMime }] = await Promise.all([
      Preferences.get({ key: 'pendingClipTitle' }),
      Preferences.get({ key: 'pendingClipBoardId' }),
      Preferences.get({ key: 'pendingShareImage' }),
      Preferences.get({ key: 'pendingShareImageMime' }),
    ]);

    await Promise.all([
      Preferences.remove({ key: 'pendingClipURL' }),
      Preferences.remove({ key: 'pendingClipTitle' }),
      Preferences.remove({ key: 'pendingClipBoardId' }),
      Preferences.remove({ key: 'pendingShareImage' }),
      Preferences.remove({ key: 'pendingShareImageMime' }),
    ]);

    // Save the clip silently without navigation
    const { saveItem, addItemToBoard } = await import('@/lib/db');
    const { detectPlatform } = await import('@/lib/parse-url');
    const { enrichItem } = await import('@/lib/enrichItem');
    const { track } = await import('@/lib/analytics');

    const platform = detectPlatform(url);
    const itemId = crypto.randomUUID();
    const item = {
      id: itemId,
      url,
      title: title || url,
      platform,
      description: '',
      thumbnail: undefined,
      locations: [] as import('@/lib/types').Location[],
      activities: [] as string[],
      tags: [] as string[],
      substance: [] as import('@/lib/types').SubstanceItem[],
      savedAt: Date.now(),
      enrichmentStatus: 'pending' as const,
      retryCount: 0,
      boardId: boardId || undefined,
    };

    await saveItem(item);
    track('clip_saved', { platform, toBoard: !!boardId, source: 'native-extension' });
    if (boardId) await addItemToBoard(boardId, itemId);
    enrichItem(itemId, url, image ?? undefined, imageMime ?? undefined);
  } catch {
    // Not in Capacitor context — silently skip
  }
}

// Reads a pending share written by the iOS Share Extension via App Groups
// (legacy URL-scheme path — kept for backward compat with old extension builds).
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const [{ value: title }, { value: image }, { value: imageMime }] = await Promise.all([
      Preferences.get({ key: 'pendingShareTitle' }),
      Preferences.get({ key: 'pendingShareImage' }),
      Preferences.get({ key: 'pendingShareImageMime' }),
    ]);

    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImage' }),
      Preferences.remove({ key: 'pendingShareImageMime' }),
    ]);

    if (image) {
      try {
        sessionStorage.setItem('pendingShareImage', image);
        sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
      } catch { /* private browsing or storage full */ }
    }

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    router.push(`/share?${qs.toString()}`);
  } catch {
    // @capacitor/preferences not installed or not in native context
  }
}

// Initializes Capacitor plugins and handles deep links from the native Share Extension.
// The iOS Share Extension opens travelpanel://share?url=...&title=... which triggers
// the appUrlOpen event here, routing into the web share capture flow.
export function CapacitorBridge() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
          import('@capacitor/app'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
        ]);

        // Handle URL scheme deep links from the iOS Share Extension.
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>
        // It also writes any image payload to App Group (pendingShareImage) before
        // opening this URL scheme — read it and stash in sessionStorage.
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');

            if (shareUrl) {
              // Pull image payload from App Group (written by ShareViewController
              // before the URL scheme fires; not passed in URL due to size limits).
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const [{ value: image }, { value: imageMime }] = await Promise.all([
                  Preferences.get({ key: 'pendingShareImage' }),
                  Preferences.get({ key: 'pendingShareImageMime' }),
                ]);
                if (image) {
                  sessionStorage.setItem('pendingShareImage', image);
                  sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
                  await Promise.all([
                    Preferences.remove({ key: 'pendingShareImage' }),
                    Preferences.remove({ key: 'pendingShareImageMime' }),
                  ]);
                }
              } catch { /* ok — image is optional */ }

              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              router.push(`/share?${qs.toString()}`);
            }
          } catch {
            // Malformed URL — ignore
          }
        });

        cleanup = () => listener.remove();

        // Status bar styling
        try {
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#6366f1' });
        } catch {
          // StatusBar not available on all form factors
        }

        await SplashScreen.hide({ fadeOutDuration: 300 });

        // Check for a clip saved by the native board picker (D12) — silent, no navigation
        checkPendingNativeClip();
        // Check for a pending share written via the legacy URL-scheme path
        checkPendingAppGroupShare(router);
      } catch {
        // Not a Capacitor context (running in a standard browser) — no-op
      }
    };

    init();
    return () => cleanup?.();
  }, [router]);

  return null;
}
