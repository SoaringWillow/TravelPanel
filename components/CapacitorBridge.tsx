'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stores image payload in sessionStorage and returns the key, or null if none.
function storeImageInSession(imageData: string | null, imageMime: string | null): string | null {
  if (!imageData) return null;
  try {
    const key = `pendingShareImage_${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify({ data: imageData, mime: imageMime ?? 'image/jpeg' }));
    return key;
  } catch {
    return null;
  }
}

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title }     = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageData } = await Preferences.get({ key: 'pendingShareImageData' });
    const { value: imageMime } = await Preferences.get({ key: 'pendingShareImageMime' });

    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImageData' });
    await Preferences.remove({ key: 'pendingShareImageMime' });

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    const imageKey = storeImageInSession(imageData, imageMime);
    if (imageKey) qs.set('imageKey', imageKey);

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
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage   = parsed.searchParams.get('hasImage') === '1';

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);

              // If the share extension flagged an image, read it from App Group storage
              if (hasImage) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  const { value: imageData } = await Preferences.get({ key: 'pendingShareImageData' });
                  const { value: imageMime } = await Preferences.get({ key: 'pendingShareImageMime' });
                  await Preferences.remove({ key: 'pendingShareImageData' });
                  await Preferences.remove({ key: 'pendingShareImageMime' });
                  const imageKey = storeImageInSession(imageData, imageMime);
                  if (imageKey) qs.set('imageKey', imageKey);
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
