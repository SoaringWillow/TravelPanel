'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share from the App Group written by the iOS Share Extension.
// The Preferences plugin is configured to use the App Group (capacitor.config.ts)
// so it reads from the same UserDefaults suite the Swift code writes to.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');

    const { value: url }   = await Preferences.get({ key: 'pendingShareURL' });
    const { value: image } = await Preferences.get({ key: 'pendingShareImage' });
    if (!url && !image) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });

    // Clear consumed keys
    await Promise.all([
      Preferences.remove({ key: 'pendingShareURL' }),
      Preferences.remove({ key: 'pendingShareTitle' }),
      Preferences.remove({ key: 'pendingShareImage' }),
    ]);

    // Hand the image to the /share page via sessionStorage (too large for URL params)
    if (image) {
      try { sessionStorage.setItem('pendingShareImage', image); } catch { /* quota */ }
    }

    const qs = new URLSearchParams();
    if (url)   qs.set('url', url);
    if (title) qs.set('title', title);
    if (image) qs.set('hasImage', '1');
    router.push(`/share?${qs.toString()}`);
  } catch {
    // @capacitor/preferences not available (browser context) — no-op
  }
}

// Initializes Capacitor plugins and handles deep links from the native Share Extension.
// The iOS Share Extension fires travelpanel://share?url=...&title=...&hasImage=1
// which triggers the appUrlOpen event here, routing into the web share capture flow.
export function CapacitorBridge() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const [{ App }, { StatusBar, Style }, { SplashScreen }, { Preferences }] = await Promise.all([
          import('@capacitor/app'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/preferences'),
        ]);

        // Handle URL scheme deep links from the iOS Share Extension.
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage   = parsed.searchParams.get('hasImage') === '1';

            if (!shareUrl && !hasImage) return;

            let imageB64: string | null = null;
            if (hasImage) {
              // Image was written to App Group by the Share Extension; read it now.
              try {
                const { value } = await Preferences.get({ key: 'pendingShareImage' });
                imageB64 = value;
                if (value) await Preferences.remove({ key: 'pendingShareImage' });
              } catch { /* ignore */ }
            }

            if (imageB64) {
              try { sessionStorage.setItem('pendingShareImage', imageB64); } catch { /* quota */ }
            }

            const qs = new URLSearchParams();
            if (shareUrl)   qs.set('url', shareUrl);
            if (shareTitle) qs.set('title', shareTitle);
            if (imageB64)   qs.set('hasImage', '1');
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
          // StatusBar unavailable on all form factors
        }

        await SplashScreen.hide({ fadeOutDuration: 300 });

        // Check for a pending share written via App Group fallback
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
