// Module-level store for image data passed from the iOS Share Extension.
// CapacitorBridge writes here when the native side captures an image;
// SharePage reads and clears it on mount so only one consumer gets it.
let pending: string | null = null;

export function setPendingImage(base64: string) {
  pending = base64;
}

export function consumePendingImage(): string | null {
  const value = pending;
  pending = null;
  return value;
}
