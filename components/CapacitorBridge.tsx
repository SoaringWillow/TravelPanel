'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share (URL + optional image) stored by the iOS Share Extension
// via App Groups. The App Group suite name must match ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const [{ value: url }, { value: imageData }] = await Promise.all([
      Preferences.get({ key: 'pendingShareURL' }),
      Preferences.get({ key: 'pendingShareImageData' }),
    ]);
    if (!url && !imageData) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImageData' }),
    ]);

    const qs = new URLSearchParams({ url: url ?? '' });
    if (title) qs.set('title', title);

    if (imageData) {
      // Store image in sessionStorage; share page reads it via imageRef param
      const imageRef = crypto.randomUUID();
      sessionStorage.setItem(`shareImage_${imageRef}`, imageData);
      qs.set('imageRef', imageRef);
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
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url') ?? '';
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === '1';

            const qs = new URLSearchParams({ url: shareUrl });
            if (shareTitle) qs.set('title', shareTitle);

            // If the Share Extension flagged an image, read it from App Group preferences
            if (hasImage) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value: imageData } = await Preferences.get({ key: 'pendingShareImageData' });
                if (imageData) {
                  await Preferences.remove({ key: 'pendingShareImageData' });
                  const imageRef = crypto.randomUUID();
                  sessionStorage.setItem(`shareImage_${imageRef}`, imageData);
                  qs.set('imageRef', imageRef);
                }
              } catch { /* no image data available */ }
            }

            if (shareUrl || hasImage) {
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
