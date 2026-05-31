'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Link2, X } from 'lucide-react';

// ─���─ Dismissed URL cache ──────────────────────────────────────────────────────

const DISMISSED_KEY = 'tp_clipboard_dismissed';
const MAX_DISMISSED = 40;

function getDismissedUrls(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function markDismissed(url: string) {
  const dismissed = Array.from(getDismissedUrls());
  const updated   = [url, ...dismissed.filter((u) => u !== url)].slice(0, MAX_DISMISSED);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUrlCandidate(text: string): string | null {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') return trimmed;
  } catch {
    // not a plain URL — try extracting from Xiaohongshu/WeChat share text
    // which often contains "http://..." somewhere in the string
    const match = trimmed.match(/https?:\/\/[^\s一-鿿]+/);
    if (match) return match[0];
  }
  return null;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

async function readClipboard(): Promise<string | null> {
  // Priority 1: Capacitor Clipboard plugin (native iOS / Android)
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      // @capacitor/clipboard is optional ��� fall through if not installed
      try {
        const { Clipboard } = await import(
          /* webpackIgnore: true */ '@capacitor/clipboard' as string
        );
        const { type, value } = await (Clipboard as { read: () => Promise<{type:string;value:string}> }).read();
        if (type === 'text/plain') return value ?? null;
      } catch {
        // Plugin not installed — fall through to navigator
      }
    }
  } catch {
    // Not a Capacitor context
  }

  // Priority 2: Web Clipboard API (works in Capacitor WKWebView + modern browsers)
  try {
    if (navigator.clipboard?.readText) {
      return (await navigator.clipboard.readText()) ?? null;
    }
  } catch {
    // Permission denied or insecure context
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClipboardBanner() {
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const checkClipboard = useCallback(async () => {
    const raw = await readClipboard();
    if (!raw) return;
    const url = parseUrlCandidate(raw);
    if (!url) return;
    if (getDismissedUrls().has(url)) return;
    setPendingUrl(url);
  }, []);

  // Check on mount
  useEffect(() => {
    checkClipboard();
  }, [checkClipboard]);

  // Re-check when window regains focus (tab switch on web)
  useEffect(() => {
    const onFocus = () => {
      if (!pendingUrl) checkClipboard();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkClipboard, pendingUrl]);

  // Re-check when native app resumes (Capacitor)
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && !pendingUrl) checkClipboard();
        });
        removeListener = () => listener.remove();
      } catch {
        // Not in a Capacitor context
      }
    })();
    return () => removeListener?.();
  }, [checkClipboard, pendingUrl]);

  function handleSave() {
    if (!pendingUrl) return;
    markDismissed(pendingUrl);
    setPendingUrl(null);
    router.push(`/share?url=${encodeURIComponent(pendingUrl)}`);
  }

  function handleDismiss() {
    if (!pendingUrl) return;
    markDismissed(pendingUrl);
    setPendingUrl(null);
  }

  return (
    <AnimatePresence>
      {pendingUrl && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="absolute top-[72px] left-4 right-4 z-[1001]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3">
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Link2 size={15} className="text-indigo-600" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                {getDomain(pendingUrl)}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                URL in clipboard — save to TravelPanel?
              </p>
            </div>

            {/* Save CTA */}
            <button
              onClick={handleSave}
              className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Save
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
