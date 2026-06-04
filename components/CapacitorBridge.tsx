'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stashes an image (base64) from the Share Extension into sessionStorage so
// the /share page can pass it to the enrichment API without encoding it in the URL.
function stashPendingImage(imageBase64: string) {
  try { sessionStorage.setItem('pendingClipImage', imageBase64); } catch { /* ignore */ }
}

// Reads a pending share URL (and optional image) stored by the iOS Share Extension
// via App Groups. The App Group suite name must match ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const [{ value: title }, { value: imageBase64 }] = await Promise.all([
      Preferences.get({ key: 'pendingShareTitle' }),
      Preferences.get({ key: 'pendingShareImage' }),
    ]);

    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImage' }),
    ]);

    if (imageBase64) stashPendingImage(imageBase64);

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    if (imageBase64) qs.set('hasImage', '1');
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
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');

            if (!shareUrl) return;

            // The Share Extension may have also stored an image in App Group
            // (for Xiaohongshu / WeChat posts where HTML scraping is blocked).
            let hasImage = false;
            try {
              const { Preferences } = await import('@capacitor/preferences');
              const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
              if (imageBase64) {
                await Preferences.remove({ key: 'pendingShareImage' });
                stashPendingImage(imageBase64);
                hasImage = true;
              }
            } catch { /* not in native context */ }

            const qs = new URLSearchParams({ url: shareUrl });
            if (shareTitle) qs.set('title', shareTitle);
            if (hasImage) qs.set('hasImage', '1');
            router.push(`/share?${qs.toString()}`);
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
