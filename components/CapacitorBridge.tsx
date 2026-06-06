'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setSharedImage } from '@/lib/imageStore';

// Reads image from App Group preferences if the Share Extension captured one.
async function readPendingImage(Preferences: { get: (o: { key: string }) => Promise<{ value: string | null }>, remove: (o: { key: string }) => Promise<void> }) {
  const { value: hasImage } = await Preferences.get({ key: 'pendingShareHasImage' });
  if (!hasImage) return;

  const { value: imageBase64 } = await Preferences.get({ key: 'pendingShareImageBase64' });
  const { value: imageMimeType } = await Preferences.get({ key: 'pendingShareImageMimeType' });

  await Preferences.remove({ key: 'pendingShareHasImage' });
  await Preferences.remove({ key: 'pendingShareImageBase64' });
  await Preferences.remove({ key: 'pendingShareImageMimeType' });

  if (imageBase64) {
    setSharedImage(imageBase64, imageMimeType ?? 'image/jpeg');
  }
}

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

    // Also read any image the extension captured
    await readPendingImage(Preferences);

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
        // The extension fires: travelpanel://share?url=<encoded>&title=<encoded>[&hasImage=1]
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === '1';

            // If the extension flagged an image, read it from App Group before routing
            if (hasImage) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                await readPendingImage(Preferences);
              } catch {}
            }

            if (shareUrl) {
              const qs = new URLSearchParams({ url: shareUrl });
              if (shareTitle) qs.set('title', shareTitle);
              router.push(`/share?${qs.toString()}`);
            } else if (hasImage) {
              // Image-only share (no URL — e.g. screenshot from Xiaohongshu)
              router.push('/share');
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
