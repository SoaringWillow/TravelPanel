'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageB64 } = await Preferences.get({ key: 'pendingShareImageB64' });
    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImageB64' });

    // Store image in sessionStorage so the share page can read it without huge URL params
    const hasImage = !!imageB64;
    if (imageB64) {
      sessionStorage.setItem('pendingShareImage', `data:image/jpeg;base64,${imageB64}`);
    }

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    if (hasImage) qs.set('hasImage', 'true');
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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=true]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === 'true';

            if (shareUrl) {
              // If the extension flagged an image, read it from Preferences and
              // stash in sessionStorage so the share page can pick it up.
              if (hasImage) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  const { value: imageB64 } = await Preferences.get({ key: 'pendingShareImageB64' });
                  await Preferences.remove({ key: 'pendingShareImageB64' });
                  if (imageB64) {
                    sessionStorage.setItem('pendingShareImage', `data:image/jpeg;base64,${imageB64}`);
                  }
                } catch {
                  // Preferences unavailable — no image
                }
              }

              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              if (hasImage) qs.set('hasImage', 'true');
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
