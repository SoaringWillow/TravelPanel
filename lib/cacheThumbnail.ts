'use client';

import { updateItemField } from './db';

// Fetches thumbnail URL and caches it as a data URI in IndexedDB.
// Fire-and-forget — failures are silently swallowed.
export async function cacheThumbnailForItem(itemId: string, thumbnailUrl: string): Promise<void> {
  if (!thumbnailUrl || thumbnailUrl.startsWith('data:')) return;
  try {
    const res = await fetch(thumbnailUrl);
    if (!res.ok) return;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = await res.arrayBuffer();
    // Skip if image is too large (>2MB)
    if (buf.byteLength > 2 * 1024 * 1024) return;
    const base64 = arrayBufferToBase64(buf);
    const dataUri = `data:${contentType};base64,${base64}`;
    await updateItemField(itemId, { thumbnail: dataUri });
  } catch {
    // Network or storage failure — leave thumbnail as URL
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
