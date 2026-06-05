'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { setPendingImage } from '@/lib/pendingImage';
import ClipboardNudge from './ClipboardNudge';

const NUDGED_SESSION_KEY = 'tp_clipboard_nudged_url';

const SOCIAL_DOMAINS = [
  'instagram.com', 'xiaohongshu.com', 'xhscdn.com',
  'weixin.qq.com', 'mp.weixin.qq.com',
  'douyin.com', 'youtube.com', 'youtu.be',
  'bilibili.com', 'b23.tv', 'tiktok.com',
];

function isTravelUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return SOCIAL_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function isAlreadyClipped(url: string): Promise<boolean> {
  try {
    const { getAllItems } = await import('@/lib/db');
    const items = await getAllItems();
    const normalize = (u: string) => {
      try { return new URL(u).href.replace(/\/$/, '').replace(/\?utm_.*/i, ''); } catch { return u; }
    };
    const norm = normalize(url);
    return items.some((item) => normalize(item.url) === norm);
  } catch {
    return false;
  }
}

// Reads a pending share URL (and optional image) stored by the iOS Share Extension
// via App Groups. The App Group suite name must match ShareViewController.swift.
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

    if (imageB64) setPendingImage(imageB64);

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
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  const checkClipboard = useCallback(async () => {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      const { value } = await Clipboard.read();
      if (!value || !isTravelUrl(value)) return;

      // Skip if already nudged in this session
      const lastNudged = sessionStorage.getItem(NUDGED_SESSION_KEY);
      if (lastNudged === value) return;

      // Skip if already saved
      if (await isAlreadyClipped(value)) return;

      sessionStorage.setItem(NUDGED_SESSION_KEY, value);
      setClipboardUrl(value);
    } catch {
      // Clipboard unavailable (web, or permission denied) — no-op
    }
  }, []);

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
        const urlListener = await App.addListener('appUrlOpen', async ({ url }) => {
          try {
            // Normalise the custom scheme to a parseable HTTPS URL
            const parsed = new URL(url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, 'https://app/'));
            const shareUrl = parsed.searchParams.get('url');
            const shareTitle = parsed.searchParams.get('title');
            const hasImage = parsed.searchParams.get('hasImage') === 'true';

            // If the extension captured an image, read it from App Group before routing
            if (hasImage) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value: imageB64 } = await Preferences.get({ key: 'pendingShareImageB64' });
                await Preferences.remove({ key: 'pendingShareImageB64' });
                if (imageB64) setPendingImage(imageB64);
              } catch {
                // Preferences unavailable — proceed without image
              }
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

        // Check clipboard when app comes back to foreground
        const stateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) checkClipboard();
        });

        cleanup = () => { urlListener.remove(); stateListener.remove(); };

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

        // Initial clipboard check on app launch
        checkClipboard();
      } catch {
        // Not a Capacitor context (running in a standard browser) — no-op
      }
    };

    init();
    return () => cleanup?.();
  }, [router, checkClipboard]);

  return (
    <AnimatePresence>
      {clipboardUrl && (
        <div
          key="clipboard-nudge"
          className="fixed top-0 left-0 right-0 z-[2000] pt-header-safe pt-[8px]"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        >
          <ClipboardNudge
            url={clipboardUrl}
            onDismiss={() => setClipboardUrl(null)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
