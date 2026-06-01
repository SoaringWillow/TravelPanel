import { NextRequest, NextResponse } from 'next/server';

// Embedding endpoint — returns a float vector for the given text.
// Requires OPENAI_API_KEY (or a compatible provider). No-ops gracefully if the
// key is absent — callers fall back to text search.
//
// When Supabase pgvector is available (B4 activation), these vectors can be
// stored and searched server-side for sub-second semantic recall at scale.
// For now they are stored per-item in IndexedDB and searched client-side.

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Embedding service not configured', code: 'NO_KEY' },
      { status: 503 }
    );
  }

  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'OpenAI error', detail: err }, { status: 502 });
    }

    const { data } = await res.json();
    return NextResponse.json({ embedding: data[0].embedding });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
