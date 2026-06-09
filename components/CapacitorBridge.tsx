'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share written by the iOS Share Extension via App Groups.
// Also reads a pending screenshot (base64) if the extension captured one.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
    const { value: imageMimeType } = await Preferences.get({ key: 'pendingShareImageMime' });

    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImage' });
    await Preferences.remove({ key: 'pendingShareImageMime' });

    // Stash image in sessionStorage so the share page can read it without a query param
    if (imageBase64) {
      sessionStorage.setItem('pendingShareImage', imageBase64);
      sessionStorage.setItem('pendingShareImageMime', imageMimeType ?? 'image/jpeg');
    }

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    router.push(`/share?${qs.toString()}`);
  } catch {
    // @capacitor/preferences not installed or not in native context
  }
}

// Initializes Capacitor plugins and handles deep links from the native Share Extension.
// Primary path: travelpanel://share?url=...&title=...&image=<base64>&imageMime=image/jpeg
// Fallback path: App Group UserDefaults → read on next app open
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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>&image=<base64>&imageMime=<mime>
        const listener = await App.addListener('appUrlOpen', ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const image      = parsed.searchParams.get('image');
            const imageMime  = parsed.searchParams.get('imageMime');

            if (!shareUrl) return;

            // Stash image in sessionStorage so the share page can read it
            if (image) {
              sessionStorage.setItem('pendingShareImage', image);
              sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
            }

            const qs = new URLSearchParams({ url: shareUrl });
            if (shareTitle) qs.set('title', shareTitle);
            router.push(`/share?${qs.toString()}`);
          } catch {
            // Malformed URL — ignore
          }
        });

        cleanup = () => listener.remove();

        try {
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#6366f1' });
        } catch {
          // StatusBar not available on all form factors
        }

        await SplashScreen.hide({ fadeOutDuration: 300 });

        // Check for a pending share written by the Share Extension via App Group fallback
        checkPendingAppGroupShare(router);
      } catch {
        // Not a Capacitor context — no-op
      }
    };

    init();
    return () => cleanup?.();
  }, [router]);

  return null;
}
