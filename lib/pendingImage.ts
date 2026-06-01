// Holds the in-memory image payload handed off from the iOS Share Extension
// via CapacitorBridge → SharePage. Single-consume: takePendingImage clears it.

let pending: string | null = null;

export function setPendingImage(base64: string): void {
  pending = base64;
}

export function takePendingImage(): string | null {
  const v = pending;
  pending = null;
  return v;
}
