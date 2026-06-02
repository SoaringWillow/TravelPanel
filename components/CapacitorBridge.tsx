'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending URL share stored by the iOS Share Extension via App Groups.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (url) {
      const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
      await Preferences.remove({ key: 'pendingShareURL' });
      await Preferences.remove({ key: 'pendingShareTitle' });

      const qs = new URLSearchParams({ url });
      if (title) qs.set('title', title);
      router.push(`/share?${qs.toString()}`);
      return;
    }

    // Check for a pending image share (from Xiaohongshu / image-only sources)
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImageBase64' });
    if (imageBase64) {
      const { value: mimeType } = await Preferences.get({ key: 'pendingShareImageMime' });
      const { value: title }    = await Preferences.get({ key: 'pendingShareTitle' });

      await Preferences.remove({ key: 'pendingShareImageBase64' });
      await Preferences.remove({ key: 'pendingShareImageMime' });
      await Preferences.remove({ key: 'pendingShareTitle' });

      // Store image in sessionStorage so the share page can read it on mount
      try {
        const previewUrl = `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`;
        sessionStorage.setItem(
          'pendingShareImage',
          JSON.stringify({ base64: imageBase64, mimeType: mimeType ?? 'image/jpeg', previewUrl }),
        );
      } catch { /* sessionStorage full — proceed without preview */ }

      const qs = new URLSearchParams({ imageMode: '1' });
      if (title) qs.set('title', title);
      router.push(`/share?${qs.toString()}`);
    }
  } catch {
    // @capacitor/preferences not installed or not in a native context
  }
}

// Initializes Capacitor plugins and handles deep links from the native Share Extension.
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
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const imageMode  = parsed.searchParams.get('imageMode') === '1';

            if (imageMode) {
              // Image is in App Group preferences — read and pass via sessionStorage
              await checkPendingAppGroupShare(router);
              return;
            }

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

        try {
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#6366f1' });
        } catch { /* StatusBar not available on all form factors */ }

        await SplashScreen.hide({ fadeOutDuration: 300 });

        // Check for a pending share written by the Share Extension fallback
        // (fires when URL scheme open wasn't available — app was closed).
        checkPendingAppGroupShare(router);
      } catch {
        // Not a Capacitor context (standard browser) — no-op
      }
    };

    init();
    return () => cleanup?.();
  }, [router]);

  return null;
}
