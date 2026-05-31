'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_GROUP_ID = 'group.com.travelpanel.app';
const PENDING_IMAGE_FILENAME = 'pendingShareImage.jpg';

// Reads a pending share URL stored by the iOS Share Extension via App Groups.
// The App Group suite name must match the one in ShareViewController.swift.
async function checkPendingAppGroupShare(router: ReturnType<typeof useRouter>) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value: url } = await Preferences.get({ key: 'pendingShareURL' });
    if (!url) return;

    const { value: title } = await Preferences.get({ key: 'pendingShareTitle' });
    await Preferences.remove({ key: 'pendingShareURL' });
    await Preferences.remove({ key: 'pendingShareTitle' });

    const qs = new URLSearchParams({ url });
    if (title) qs.set('title', title);

    // Check if the Share Extension also saved an image for Vision extraction
    const imageData = await readPendingImageFromAppGroup();
    if (imageData) {
      // Store image in sessionStorage so the /share page can access it
      // (can't pass it in URL — too large)
      try { sessionStorage.setItem('pendingShareImage', imageData); } catch { /* storage full */ }
      qs.set('hasImage', '1');
    }

    router.push(`/share?${qs.toString()}`);
  } catch {
    // @capacitor/preferences not installed or not in native context
  }
}

// Attempt to read the pending image file from the App Group shared container
// using the Capacitor Filesystem plugin. Returns a base64 data URI or null.
async function readPendingImageFromAppGroup(): Promise<string | null> {
  try {
    // Check the flag first to avoid unnecessary file reads
    const { Preferences } = await import('@capacitor/preferences');
    const { value: hasImage } = await Preferences.get({ key: 'hasPendingImage' });
    if (!hasImage) return null;
    await Preferences.remove({ key: 'hasPendingImage' });

    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path: `${APP_GROUP_ID}/${PENDING_IMAGE_FILENAME}`,
      directory: Directory.External, // App Group container mapped here by Capacitor plugin
    });
    // Clean up the file after reading
    await Filesystem.deleteFile({
      path: `${APP_GROUP_ID}/${PENDING_IMAGE_FILENAME}`,
      directory: Directory.External,
    }).catch(() => {});
    return `data:image/jpeg;base64,${result.data}`;
  } catch {
    return null;
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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=1]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === '1';

            if (shareUrl !== null) { // empty string is valid (image-only share)
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);

              if (hasImage) {
                const imageData = await readPendingImageFromAppGroup();
                if (imageData) {
                  try { sessionStorage.setItem('pendingShareImage', imageData); } catch { /* storage full */ }
                  qs.set('hasImage', '1');
                }
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
