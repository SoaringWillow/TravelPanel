// Ephemeral sessionStorage-backed store for images captured by the iOS Share Extension.
// CapacitorBridge writes here; the share page reads and clears.

function isClient() {
  return typeof window !== 'undefined';
}

export function setSharedImage(base64: string, mimeType = 'image/jpeg') {
  if (!isClient()) return;
  try {
    sessionStorage.setItem('tp_sharedImageBase64', base64);
    sessionStorage.setItem('tp_sharedImageMimeType', mimeType);
  } catch {}
}

export function getSharedImage(): { base64: string; mimeType: string } | null {
  if (!isClient()) return null;
  try {
    const base64 = sessionStorage.getItem('tp_sharedImageBase64');
    const mimeType = sessionStorage.getItem('tp_sharedImageMimeType') ?? 'image/jpeg';
    return base64 ? { base64, mimeType } : null;
  } catch {
    return null;
  }
}

export function clearSharedImage() {
  if (!isClient()) return;
  try {
    sessionStorage.removeItem('tp_sharedImageBase64');
    sessionStorage.removeItem('tp_sharedImageMimeType');
  } catch {}
}
