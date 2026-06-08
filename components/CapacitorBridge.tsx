'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share (URL + optional screenshot) stored by the iOS Share
// Extension via App Groups. The App Group suite name must match the one in
// ShareViewController.swift. Screenshots are moved to sessionStorage so the
// share page can pass them to the enrichment API without polluting the URL.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });

    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImage' });

    // Store screenshot out-of-band (too large for URL params)
    if (imageBase64) {
      try { sessionStorage.setItem('pendingShareImage', imageBase64); } catch { /* storage full */ }
    }

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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=true]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl   = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage   = parsed.searchParams.get('hasImage') === 'true';

            // When the extension also captured a screenshot, read it from App Group
            // preferences and move it to sessionStorage for the share page to pick up.
            if (hasImage) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value: img } = await Preferences.get({ key: 'pendingShareImage' });
                if (img) {
                  try { sessionStorage.setItem('pendingShareImage', img); } catch { /* full */ }
                  await Preferences.remove({ key: 'pendingShareImage' });
                }
              } catch { /* not in native context */ }
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
