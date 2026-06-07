'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, X } from 'lucide-react';
import { detectPlatform, PLATFORM_LABELS } from '@/lib/parse-url';
import { useRouter } from 'next/navigation';

// URLs that are recognisable travel/social content worth importing
const TRAVEL_URL_PATTERNS = [
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'xiaohongshu.com',
  'xhslink.com',
  'xhs.link',
  'douyin.com',
  'iesdouyin.com',
  'bilibili.com',
  'b23.tv',
  'weixin.qq.com',
  'mp.weixin',
  'maps.google',
  'maps.apple',
  'tripadvisor.com',
  'yelp.com',
  'booking.com',
  'airbnb.com',
  'hotels.com',
  'expedia.com',
  'pinterest.com',
];

function isTravelUrl(url: string): boolean {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return TRAVEL_URL_PATTERNS.some((p) => url.includes(p));
}

export function ClipboardBanner() {
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkClipboard = useCallback(async () => {
    if (dismissed) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !isTravelUrl(text)) return;

      // Don't show the same URL twice in a session
      const seen = sessionStorage.getItem('clipboardUrlSeen');
      if (seen === text) return;

      setPendingUrl(text);
    } catch {
      // Clipboard permission denied or unavailable — silent no-op
    }
  }, [dismissed]);

  // Check on mount and on tab/app focus
  useEffect(() => {
    checkClipboard();

    const handleFocus = () => checkClipboard();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkClipboard]);

  function handleImport() {
    if (!pendingUrl) return;
    sessionStorage.setItem('clipboardUrlSeen', pendingUrl);
    setPendingUrl(null);
    router.push(`/?import=${encodeURIComponent(pendingUrl)}`);
  }

  function handleDismiss() {
    if (pendingUrl) sessionStorage.setItem('clipboardUrlSeen', pendingUrl);
    setPendingUrl(null);
    setDismissed(true);
  }

  if (!pendingUrl) return null;

  const platform = detectPlatform(pendingUrl);
  const label = PLATFORM_LABELS[platform];

  return (
    <AnimatePresence>
      <motion.div
        key="clipboard-banner"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[2100] px-3 pt-2"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
      >
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
          <Clipboard size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Clip from clipboard?
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
              {label} link detected
            </p>
          </div>
          <button
            type="button"
            onClick={handleImport}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
