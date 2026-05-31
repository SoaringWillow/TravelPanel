'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share (URL + optional image) stored by the iOS Share Extension
// via App Groups. The image is stored in sessionStorage so the /share page can
// pass it to enrichItem for Claude Vision extraction.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const [{ value: title }, { value: imageBase64 }, { value: imageMimeType }] =
      await Promise.all([
        Preferences.get({ key: 'pendingShareTitle' }),
        Preferences.get({ key: 'pendingShareImageBase64' }),
        Preferences.get({ key: 'pendingShareImageMimeType' }),
      ]);

    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImageBase64' }),
      Preferences.remove({ key: 'pendingShareImageMimeType' }),
    ]);

    // Stash image in sessionStorage so the /share page can read it without
    // encoding it in the URL (images are too large for query params).
    if (imageBase64) {
      try {
        sessionStorage.setItem(
          'pendingShareImage',
          JSON.stringify({ base64: imageBase64, mimeType: imageMimeType ?? 'image/jpeg' }),
        );
      } catch {
        // sessionStorage full or unavailable — enrichment will fall back to text-only
      }
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
        // Images are never in the URL — they're written to App Group by the extension
        // and read separately via checkPendingAppGroupShare / Preferences.
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');

            if (shareUrl) {
              // Image may have been written to App Group by the Share Extension at the
              // same time — pick it up now before navigating to /share.
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const [{ value: imageBase64 }, { value: imageMimeType }] = await Promise.all([
                  Preferences.get({ key: 'pendingShareImageBase64' }),
                  Preferences.get({ key: 'pendingShareImageMimeType' }),
                ]);
                if (imageBase64) {
                  await Promise.all([
                    Preferences.remove({ key: 'pendingShareImageBase64' }),
                    Preferences.remove({ key: 'pendingShareImageMimeType' }),
                  ]);
                  sessionStorage.setItem(
                    'pendingShareImage',
                    JSON.stringify({ base64: imageBase64, mimeType: imageMimeType ?? 'image/jpeg' }),
                  );
                }
              } catch {
                // Not critical — share still works without image
              }

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
