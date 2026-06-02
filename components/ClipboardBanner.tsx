'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClipboardBannerProps {
  onClip: (url: string) => void;
}

const DISMISSED_KEY = 'tp_dismissed_clipboard_urls';
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/i;

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDismissed(url: string) {
  try {
    const set = getDismissed();
    set.add(url);
    // Cap at 50 entries to keep storage tidy
    const trimmed = Array.from(set).slice(-50);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function extractUrl(text: string): string | null {
  const match = URL_PATTERN.exec(text);
  return match ? match[0].replace(/[.,;!?)]+$/, '') : null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 30);
  }
}

export default function ClipboardBanner({ onClip }: ClipboardBannerProps) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const checkClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const url = extractUrl(text);
      if (!url) return;
      if (getDismissed().has(url)) return;
      setPendingUrl(url);
    } catch {
      // Permission denied or unavailable — silent no-op
    }
  }, []);

  // Check on mount and whenever the tab becomes visible (app foregrounded)
  useEffect(() => {
    checkClipboard();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkClipboard();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkClipboard]);

  function handleClip() {
    if (!pendingUrl) return;
    onClip(pendingUrl);
    setPendingUrl(null);
  }

  function handleDismiss() {
    if (!pendingUrl) return;
    addDismissed(pendingUrl);
    setPendingUrl(null);
  }

  return (
    <AnimatePresence>
      {pendingUrl && (
        <motion.div
          key="clipboard-banner"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute top-[72px] left-4 right-4 z-[1100] bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3"
        >
          <Clipboard size={16} className="text-indigo-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">
              Clip from clipboard?
            </p>
            <p className="text-xs text-gray-400 truncate">{getDomain(pendingUrl)}</p>
          </div>
          <button
            type="button"
            onClick={handleClip}
            className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Clip it
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
