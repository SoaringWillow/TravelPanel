'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share stored by the iOS Share Extension via App Groups.
// Handles both URL shares and image/screenshot shares (e.g. from Xiaohongshu).
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');

    // Check for screenshot share (image from Share Sheet — primary Xiaohongshu path)
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
    if (imageBase64) {
      const [{ value: mediaType }, { value: title }] = await Promise.all([
        Preferences.get({ key: 'pendingShareMediaType' }),
        Preferences.get({ key: 'pendingShareTitle' }),
      ]);
      await Promise.all([
        Preferences.remove({ key: 'pendingShareImage' }),
        Preferences.remove({ key: 'pendingShareMediaType' }),
        Preferences.remove({ key: 'pendingShareTitle' }),
      ]);
      // Pass image via sessionStorage (too large for query params)
      sessionStorage.setItem('pendingShareImage', imageBase64);
      sessionStorage.setItem('pendingShareMediaType', mediaType ?? 'image/jpeg');
      const qs = new URLSearchParams({ mode: 'screenshot' });
      if (title) qs.set('title', title);
      router.push(`/share?${qs.toString()}`);
      return;
    }

    // Check for URL share (existing behaviour)
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });

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
        // URL share:        travelpanel://share?url=<encoded>&title=<encoded>
        // Screenshot share: travelpanel://share?mode=screenshot&title=<encoded>
        //   (image data is already in App Group, read by checkPendingAppGroupShare)
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const mode = parsed.searchParams.get('mode');

            if (mode === 'screenshot') {
              // Image data was written to App Group by Share Extension — read it now
              // (App may already be running, so checkPendingAppGroupShare won't re-run)
              await checkPendingAppGroupShare(router);
              return;
            }

            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            if (shareUrl) {
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

        // Check for a pending share written by the Share Extension via App Group
        // fallback (fires when the URL scheme open wasn't available).
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
