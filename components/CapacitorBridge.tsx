'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// AppDelegate bridges from App Group → UserDefaults.standard with cap_prefs_ prefix.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');

    // B3: check for a pending image share first (Xiaohongshu / WeChat vision flow)
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
    if (imageBase64) {
      const { value: mime }  = await Preferences.get({ key: 'pendingShareImageMime' });
      const { value: imgUrl }   = await Preferences.get({ key: 'pendingShareImageURL' });
      const { value: imgTitle } = await Preferences.get({ key: 'pendingShareImageTitle' });

      // Clear immediately to prevent replay
      await Promise.all([
        Preferences.remove({ key: 'pendingShareImage' }),
        Preferences.remove({ key: 'pendingShareImageMime' }),
        Preferences.remove({ key: 'pendingShareImageURL' }),
        Preferences.remove({ key: 'pendingShareImageTitle' }),
      ]);

      // Store image in sessionStorage so the share page can access it without
      // exceeding URL length limits
      sessionStorage.setItem('visionImage', imageBase64);
      sessionStorage.setItem('visionMime', mime ?? 'image/jpeg');

      const qs = new URLSearchParams({ visionMode: 'true' });
      if (imgUrl)   qs.set('url', imgUrl);
      if (imgTitle) qs.set('title', imgTitle);
      router.push(`/share?${qs.toString()}`);
      return;
    }

    // Standard URL share fallback
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
        // Standard:    travelpanel://share?url=<encoded>&title=<encoded>
        // Vision (B3): travelpanel://share?hasImage=true[&url=...&title=...]
        const listener = await App.addListener('appUrlOpen', ({ url }: { url: string }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const hasImage  = parsed.searchParams.get('hasImage') === 'true';
            const shareUrl  = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');

            if (hasImage) {
              // AppDelegate already bridged the image to UserDefaults.standard.
              // checkPendingAppGroupShare will pick it up and route to vision mode.
              // We call it after a short delay to let the bridge write settle.
              setTimeout(() => checkPendingAppGroupShare(router), 300);
            } else if (shareUrl) {
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
