'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');

    // Check for a pending image first (Xiaohongshu/WeChat screenshot via App Group)
    const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImage' });
    if (imageBase64) {
      const { value: imageMime } = await Preferences.get({ key: 'pendingShareImageMime' });
      try {
        sessionStorage.setItem('pendingShareImageBase64', `data:${imageMime ?? 'image/jpeg'};base64,${imageBase64}`);
        sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
      } catch {
        // sessionStorage unavailable
      }
      await Preferences.remove({ key: 'pendingShareImage' });
      await Preferences.remove({ key: 'pendingShareImageMime' });
      router.push('/share?hasImage=1');
      return;
    }

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

        const [{ App }, { StatusBar, Style }, { SplashScreen }, { Preferences }] = await Promise.all([
          import('@capacitor/app'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/preferences'),
        ]);

        // Handle URL scheme deep links from the iOS Share Extension.
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&imageGroupKey=<key>]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const imageGroupKey = parsed.searchParams.get('imageGroupKey');

            // If the extension stored an image in App Group Preferences, read it
            // and relay it to the share page via sessionStorage.
            if (imageGroupKey) {
              try {
                const { value: imageBase64 } = await Preferences.get({ key: imageGroupKey });
                const { value: imageMime } = await Preferences.get({ key: `${imageGroupKey}Mime` });
                if (imageBase64) {
                  sessionStorage.setItem('pendingShareImageBase64', `data:${imageMime ?? 'image/jpeg'};base64,${imageBase64}`);
                  sessionStorage.setItem('pendingShareImageMime', imageMime ?? 'image/jpeg');
                  await Preferences.remove({ key: imageGroupKey });
                  await Preferences.remove({ key: `${imageGroupKey}Mime` });
                }
              } catch {
                // Image read failed — share page will show the screenshot prompt
              }
            }

            const targetUrl = shareUrl || '';
            const qs = new URLSearchParams();
            if (targetUrl) qs.set('url', targetUrl);
            if (shareTitle) qs.set('title', shareTitle);
            if (imageGroupKey) qs.set('hasImage', '1');
            router.push(`/share?${qs.toString()}`);
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
