'use client';

import { useEffect } from 'react';
import { SavedItem } from '@/lib/types';
import { saveItem } from '@/lib/db';
import { track } from '@/lib/analytics';

// Receives pending clips posted by the TravelPanel browser extension's content script.
// The content script (running in TravelPanel pages) reads from chrome.storage.local
// and sends { source: 'travelpanel-clipper', type: 'PENDING_CLIPS', clips: [...] }.
export function ExtensionBridge() {
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.source !== 'travelpanel-clipper') return;
      if (event.data?.type !== 'PENDING_CLIPS') return;

      const clips: SavedItem[] = Array.isArray(event.data.clips) ? event.data.clips : [];
      if (clips.length === 0) return;

      let imported = 0;
      for (const clip of clips) {
        try {
          if (clip.id && clip.url) {
            await saveItem(clip);
            imported++;
          }
        } catch {
          // Already saved or malformed — skip
        }
      }

      if (imported > 0) {
        track('extension_clips_imported', { count: imported });
        window.dispatchEvent(
          new CustomEvent('travelpanel:clips-imported', { detail: { count: imported } })
        );
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}
