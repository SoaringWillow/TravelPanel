'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share written by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
// An optional base64 image is passed via sessionStorage (too large for query params).
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

    // Store image in sessionStorage so the share page can read it without a query-param size limit
    if (image) {
      try {
        sessionStorage.setItem('pendingShareImage', image);
        sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
      } catch {
        // sessionStorage quota exceeded — proceed without image
      }
    }

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    if (image) qs.set('hasImage', '1');
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
        const listener = await App.addListener('appUrlOpen', ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage');

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              // hasImage=1 means the image was already stored in App Group by the Swift extension;
              // checkPendingAppGroupShare will read it into sessionStorage on next launch.
              // For URL-scheme opens (extension stayed alive), pass the flag through.
              if (hasImage) qs.set('hasImage', hasImage);
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
