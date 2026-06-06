'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PENDING_IMAGE_KEY = 'pendingShareImage';
const APP_GROUP_IMAGE_PREF = 'pendingShareImageBase64';
const APP_GROUP_URL_PREF = 'pendingShareURL';
const APP_GROUP_TITLE_PREF = 'pendingShareTitle';

// Reads a pending share stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift
// and the Preferences group in capacitor.config.ts.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: APP_GROUP_URL_PREF });
    if (!url) return;

    const [{ value: title }, { value: imageBase64 }] = await Promise.all([
      Preferences.get({ key: APP_GROUP_TITLE_PREF }),
      Preferences.get({ key: APP_GROUP_IMAGE_PREF }),
    ]);

    await Promise.all([
      Preferences.remove({ key: APP_GROUP_URL_PREF }),
      Preferences.remove({ key: APP_GROUP_TITLE_PREF }),
      imageBase64 ? Preferences.remove({ key: APP_GROUP_IMAGE_PREF }) : Promise.resolve(),
    ]);

    if (imageBase64) {
      sessionStorage.setItem(PENDING_IMAGE_KEY, imageBase64);
    }

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);
    if (imageBase64) qs.set('hasImage', '1');
    router.push(`/share?${qs.toString()}`);
  } catch {
    // @capacitor/preferences not installed or not in native context
  }
}

// Initializes Capacitor plugins and handles deep links from the native Share Extension.
// The iOS Share Extension opens travelpanel://share?url=...&title=...&hasImage=1
// which triggers the appUrlOpen event here, routing into the web share capture flow.
// When hasImage=1, the extension has stored a base64 JPEG in the App Group; we read
// it here and stash it in sessionStorage before navigating to /share.
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
        const listener = await App.addListener('appUrlOpen', ({ url }) => {
          (async () => {
            try {
              const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
              const shareUrl = parsed.searchParams.get('url');
              const shareTitle = parsed.searchParams.get('title');
              const hasImage = parsed.searchParams.get('hasImage') === '1';

              if (!shareUrl) return;

              if (hasImage) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  const { value: imageBase64 } = await Preferences.get({ key: APP_GROUP_IMAGE_PREF });
                  if (imageBase64) {
                    sessionStorage.setItem(PENDING_IMAGE_KEY, imageBase64);
                    await Preferences.remove({ key: APP_GROUP_IMAGE_PREF });
                  }
                } catch {
                  // Preferences not available
                }
              }

              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              if (hasImage) qs.set('hasImage', '1');
              router.push(`/share?${qs.toString()}`);
            } catch {
              // Malformed URL — ignore
            }
          })();
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
