'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clipboard } from 'lucide-react';
import { detectPlatform, PLATFORM_LABELS } from '@/lib/parse-url';

// Domains that indicate a travel-relevant URL worth quick-saving
const TRAVEL_DOMAINS = [
  'instagram.com', 'youtube.com', 'youtu.be',
  'xiaohongshu.com', 'xhslink.com', 'douyin.com', 'tiktok.com',
  'bilibili.com', 'b23.tv',
  'maps.google', 'google.com/maps',
  'tripadvisor.com', 'airbnb.com', 'booking.com', 'expedia.com',
  'hotels.com', 'viator.com', 'getyourguide.com',
  'lonelyplanet.com', 'cntraveler.com', 'travelandleisure.com',
  'pinterest.com', 'weibo.com', 'twitter.com', 'x.com',
];

function isTravelUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return TRAVEL_DOMAINS.some((d) => u.hostname.includes(d));
  } catch {
    return false;
  }
}

const DISMISSED_KEY_PREFIX = 'clipDismissed_';

interface ClipboardBannerProps {
  onSave: (url: string) => void;
}

export default function ClipboardBanner({ onSave }: ClipboardBannerProps) {
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>('');

  const checkClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed.startsWith('http')) return;
      if (!isTravelUrl(trimmed)) return;

      // Don't re-show if user already dismissed this exact URL
      const hash = btoa(trimmed).slice(0, 20);
      if (sessionStorage.getItem(DISMISSED_KEY_PREFIX + hash)) return;

      setClipUrl(trimmed);
      setPlatform(PLATFORM_LABELS[detectPlatform(trimmed)]);
    } catch {
      // Clipboard permission denied — silently skip
    }
  }, []);

  useEffect(() => {
    checkClipboard();

    const onFocus = () => checkClipboard();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [checkClipboard]);

  function dismiss() {
    if (!clipUrl) return;
    const hash = btoa(clipUrl).slice(0, 20);
    sessionStorage.setItem(DISMISSED_KEY_PREFIX + hash, '1');
    setClipUrl(null);
  }

  function handleSave() {
    if (!clipUrl) return;
    onSave(clipUrl);
    dismiss();
  }

  return (
    <AnimatePresence>
      {clipUrl && (
        <motion.div
          key="clipboard-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-24 left-4 right-4 z-[1200] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
        >
          <div className="flex-shrink-0 w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center">
            <Clipboard size={17} className="text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
              Clip from {platform}?
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {clipUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors"
            aria-label="Save clipboard URL"
          >
            Save
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
