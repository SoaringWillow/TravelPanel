'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { detectPlatform, PLATFORM_LABELS } from '@/lib/parse-url';

// Travel-specific hostnames we recognize as potentially interesting URLs
const TRAVEL_HOSTS = [
  'instagram.com', 'youtube.com', 'youtu.be',
  'xiaohongshu.com', 'xhslink.com',
  'tiktok.com', 'twitter.com', 'x.com',
  'douyin.com', 'bilibili.com',
  'tripadvisor.com', 'booking.com', 'airbnb.com',
  'google.com/maps', 'maps.google', 'maps.apple.com',
  'expedia.com', 'hotels.com', 'hostelworld.com',
  'lonelyplanet.com', 'viator.com', 'getyourguide.com',
  'klook.com', 'kkday.com',
];

function isTravelUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host   = parsed.hostname.replace('www.', '').toLowerCase();
    const full   = host + parsed.pathname;
    return TRAVEL_HOSTS.some((h) => full.startsWith(h) || host.includes(h.split('/')[0]));
  } catch {
    return false;
  }
}

function truncateUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace('www.', '');
    const path = pathname.length > 24 ? pathname.slice(0, 24) + '…' : pathname;
    return `${host}${path === '/' ? '' : path}`;
  } catch {
    return url.slice(0, 40);
  }
}

export function ClipboardBanner() {
  const [detected, setDetected] = useState<string | null>(null);
  const router  = useRouter();
  const lastUrl = useRef<string | null>(null);
  const dismissed = useRef(new Set<string>());

  const checkClipboard = useCallback(async () => {
    try {
      // Only works after a user gesture in secure context
      const text = await navigator.clipboard.readText();
      if (
        text &&
        text !== lastUrl.current &&
        !dismissed.current.has(text) &&
        isTravelUrl(text)
      ) {
        lastUrl.current = text;
        setDetected(text);
      }
    } catch {
      // Clipboard permission denied or not available — silently no-op
    }
  }, []);

  useEffect(() => {
    // Check on first user interaction (clipboard read requires user gesture on iOS)
    const onInteraction = () => {
      checkClipboard();
      // Also check when the app comes back to foreground (switch from another app)
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkClipboard();
    };

    window.addEventListener('pointerdown', onInteraction, { once: true, passive: true });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', onInteraction);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkClipboard]);

  function handleClip() {
    if (!detected) return;
    const qs = new URLSearchParams({ url: detected });
    dismissed.current.add(detected);
    setDetected(null);
    router.push(`/share?${qs.toString()}`);
  }

  function handleDismiss() {
    if (detected) dismissed.current.add(detected);
    setDetected(null);
  }

  if (!detected) return null;

  const platform = detectPlatform(detected);
  const label    = PLATFORM_LABELS[platform];

  return (
    <AnimatePresence>
      {detected && (
        <motion.div
          key="clipboard-banner"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[2100] px-3 pt-safe-top"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3 px-4 py-3 mx-auto max-w-sm">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
              <Link2 size={15} className="text-indigo-600 dark:text-indigo-400" />
            </div>

            <button
              type="button"
              className="flex-1 text-left min-w-0"
              onClick={handleClip}
            >
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                Clip this {label} link?
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {truncateUrl(detected)}
              </div>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
