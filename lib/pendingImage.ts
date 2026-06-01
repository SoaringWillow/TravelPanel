'use client';

// Module-level singleton that bridges the CapacitorBridge (which reads the
// image from the iOS App Group on launch) to the share page (which consumes it).
// Image lives here only until the share page mounts and calls takePendingImage().

interface PendingImage {
  base64: string;    // raw base64, no data URI prefix
  mediaType: string; // e.g. "image/jpeg"
}

let pending: PendingImage | null = null;

export function setPendingImage(data: PendingImage) {
  pending = data;
}

/** Consume and clear. Returns null if no image is waiting. */
export function takePendingImage(): PendingImage | null {
  const v = pending;
  pending = null;
  return v;
}
