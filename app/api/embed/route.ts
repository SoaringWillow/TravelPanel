import { NextRequest, NextResponse } from 'next/server';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL = 'voyage-3-lite'; // 512 dimensions, fast + cheap

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}

// Generate a text embedding using Voyage AI.
// Returns an empty array when VOYAGE_API_KEY is not set — callers treat this
// as "semantic search unavailable, fall back to keyword search".
export async function POST(req: NextRequest) {
  let text: string;
  let inputType: 'document' | 'query' = 'query';

  try {
    const body = await req.json();
    text = body.text;
    if (body.type === 'document') inputType = 'document';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  if (!VOYAGE_API_KEY) {
    // Graceful no-op: return empty embedding so client degrades to keyword search
    return NextResponse.json({ embedding: [] });
  }

  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: [text.slice(0, 4000)], // Voyage-3-lite context limit
        input_type: inputType,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[embed] Voyage API error:', res.status, err);
      return NextResponse.json({ embedding: [] });
    }

    const data = (await res.json()) as VoyageResponse;
    const embedding = data.data?.[0]?.embedding ?? [];
    return NextResponse.json({ embedding });
  } catch (err) {
    console.error('[embed] Voyage API request failed:', err);
    return NextResponse.json({ embedding: [] });
  }
}
