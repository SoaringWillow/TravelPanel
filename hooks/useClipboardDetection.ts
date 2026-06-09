'use client';

import { useState, useEffect, useCallback } from 'react';

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

// Travel-relevant domains that are worth offering to clip
const TRAVEL_DOMAINS = [
  'youtube.com', 'youtu.be',
  'instagram.com',
  'tiktok.com', 'douyin.com', 'iesdouyin.com',
  'xiaohongshu.com', 'xhslink.com', 'xhs.link',
  'bilibili.com', 'b23.tv',
  'weixin.qq.com', 'mp.weixin',
  'tripadvisor.com', 'tripadvisor.',
  'airbnb.com',
  'booking.com',
  'maps.google.com', 'goo.gl/maps',
  'maps.app.goo.gl',
  'lonelyplanet.com',
  'travel.com',
];

function isTravelUrl(url: string): boolean {
  return TRAVEL_DOMAINS.some((d) => url.includes(d));
}

export function useClipboardDetection() {
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      if (!navigator.clipboard?.readText) return;
      const text = await navigator.clipboard.readText();
      if (!text || !URL_PATTERN.test(text.trim())) return;

      const url = text.trim();
      if (!isTravelUrl(url)) return;

      // Don't show the same URL twice in one session
      const dismissed = sessionStorage.getItem('clipboard_dismissed');
      if (dismissed === url) return;

      setClipboardUrl(url);
    } catch {
      // Clipboard read denied or unavailable — silently skip
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handler);
    // Also check shortly after mount (covers app open from background)
    const t = setTimeout(check, 800);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      clearTimeout(t);
    };
  }, [check]);

  const dismiss = useCallback(() => {
    if (clipboardUrl) sessionStorage.setItem('clipboard_dismissed', clipboardUrl);
    setClipboardUrl(null);
  }, [clipboardUrl]);

  const accept = useCallback(() => {
    const url = clipboardUrl;
    if (url) sessionStorage.setItem('clipboard_dismissed', url);
    setClipboardUrl(null);
    return url;
  }, [clipboardUrl]);

  return { clipboardUrl, dismiss, accept };
}
