'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Helper: read an image from App Group Preferences, store in sessionStorage, return the key.
async function storeImageFromPreferences(
  Preferences: { get: (o: { key: string }) => Promise<{ value: string | null }>, remove: (o: { key: string }) => Promise<void> },
  appGroupKey: string,
): Promise<string | undefined> {
  const { value: image } = await Preferences.get({ key: appGroupKey });
  if (!image) return undefined;
  await Preferences.remove({ key: appGroupKey });
  const sessionKey = `shareImage_${Date.now()}`;
  try { sessionStorage.setItem(sessionKey, image); } catch { /* storage full */ }
  return sessionKey;
}

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    const { value: imageAppGroupKey } = await Preferences.get({ key: 'pendingShareImageKey' });

    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareImageKey' });

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);

    if (imageAppGroupKey) {
      const sessionKey = await storeImageFromPreferences(Preferences, imageAppGroupKey);
      if (sessionKey) qs.set('imageKey', sessionKey);
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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&imageKey=<key>]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const appGroupImageKey = parsed.searchParams.get('imageKey');

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);

              // If the Share Extension stored an image in App Group, move it to sessionStorage
              if (appGroupImageKey) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  const sessionKey = await storeImageFromPreferences(Preferences, appGroupImageKey);
                  if (sessionKey) qs.set('imageKey', sessionKey);
                } catch { /* Preferences unavailable */ }
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
