'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// SessionStorage key used to ferry image data from the App Group to the share page.
// The share page reads and clears this on mount.
export const PENDING_IMAGE_SESSION_KEY = 'tp_pending_image_data';
export const PENDING_IMAGE_TYPE_KEY    = 'tp_pending_image_type';

// Reads a pending share URL (and optional image) stored by the iOS Share Extension
// via App Groups. Image data is stashed in sessionStorage so the share page can
// pass it to the vision enrichment path without URL-length constraints.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title }     = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageData } = await Preferences.get({ key: 'pendingShareImageData' });
    const { value: imageType } = await Preferences.get({ key: 'pendingShareImageMediaType' });

    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImageData' }),
      Preferences.remove({ key: 'pendingShareImageMediaType' }),
    ]);

    if (imageData) {
      sessionStorage.setItem(PENDING_IMAGE_SESSION_KEY, imageData);
      sessionStorage.setItem(PENDING_IMAGE_TYPE_KEY, imageType ?? 'image/jpeg');
    }

    const qs = new URLSearchParams({ url });
    if (title)     qs.set('title', title);
    if (imageData) qs.set('hasImage', '1');
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
        // The extension fires:
        //   travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=1]
        // When hasImage=1 the image bytes are already in the App Group
        // UserDefaults under pendingShareImageData; we read them here and
        // stash them in sessionStorage so the share page can use them.
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage   = parsed.searchParams.get('hasImage') === '1';

            if (hasImage) {
              // Pull image from App Group and stash for the share page
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value: imageData } = await Preferences.get({ key: 'pendingShareImageData' });
                const { value: imageType } = await Preferences.get({ key: 'pendingShareImageMediaType' });
                if (imageData) {
                  sessionStorage.setItem(PENDING_IMAGE_SESSION_KEY, imageData);
                  sessionStorage.setItem(PENDING_IMAGE_TYPE_KEY, imageType ?? 'image/jpeg');
                  await Preferences.remove({ key: 'pendingShareImageData' });
                  await Preferences.remove({ key: 'pendingShareImageMediaType' });
                }
              } catch {
                // Preferences not available — skip vision path
              }
            }

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              if (hasImage)   qs.set('hasImage', '1');
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
