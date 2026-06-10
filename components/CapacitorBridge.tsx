'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share (URL + optional screenshot image) written by the iOS Share Extension
// via App Group UserDefaults. Configure Preferences to use the shared App Group suite.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    // Use the App Group suite so we read from the same UserDefaults as the Share Extension.
    await Preferences.configure({ group: 'group.com.travelpanel.app' });

    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title }      = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
    const { value: imageMime }   = await Preferences.get({ key: 'pendingShareImageMime' });

    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImage' });
    await Preferences.remove({ key: 'pendingShareImageMime' });

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);

    if (imageBase64) {
      // Bridge the image via sessionStorage to avoid URL length limits
      try {
        sessionStorage.setItem('pendingShareImage', imageBase64);
        sessionStorage.setItem('pendingShareImageMime', imageMime || 'image/jpeg');
        qs.set('hasPendingImage', '1');
      } catch { /* sessionStorage unavailable */ }
    }

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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=1]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed   = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === '1';

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);

              if (hasImage) {
                // Read image written to App Group by ShareViewController
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  await Preferences.configure({ group: 'group.com.travelpanel.app' });
                  const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
                  const { value: imageMime }   = await Preferences.get({ key: 'pendingShareImageMime' });
                  await Preferences.remove({ key: 'pendingShareImage' });
                  await Preferences.remove({ key: 'pendingShareImageMime' });
                  if (imageBase64) {
                    sessionStorage.setItem('pendingShareImage', imageBase64);
                    sessionStorage.setItem('pendingShareImageMime', imageMime || 'image/jpeg');
                    qs.set('hasPendingImage', '1');
                  }
                } catch { /* Preferences not available */ }
              }

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
