import { TripPlan } from './types';

// Encode a plan into a URL-safe base64 string for hash-based sharing.
// Uses the native TextEncoder/Decoder + CompressionStream when available,
// falling back to plain base64 for environments that don't support it.
export async function encodePlan(plan: TripPlan): Promise<string> {
  const json  = JSON.stringify(plan);
  const bytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    const cs     = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressed = await new Response(cs.readable).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(compressed)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Fallback: plain base64 (no compression)
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decodePlan(encoded: string): Promise<TripPlan> {
  const b64     = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary  = atob(b64);
  const bytes   = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds      = new DecompressionStream('deflate-raw');
      const writer  = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const text = await new Response(ds.readable).text();
      return JSON.parse(text) as TripPlan;
    } catch {
      // Fall through to plain base64 path
    }
  }

  // Fallback: assume plain base64
  const json = decodeURIComponent(escape(binary));
  return JSON.parse(json) as TripPlan;
}
