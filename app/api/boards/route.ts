import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const runtime = 'edge';

// GET /api/boards
// Returns the user's boards for the browser extension board-picker.
// When Supabase is not configured, returns empty (extension falls back to IndexedDB cache).
// Expects Authorization: Bearer <supabase-jwt> from the extension.
export async function GET(req: Request) {
  // CORS headers so the extension popup can call this
  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ boards: [] }, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ boards: [] }, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase
      .from('boards')
      .select('id, name, emoji, item_ids, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return NextResponse.json({ boards: [] }, { headers: corsHeaders });
    }

    const boards = data.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji || '🗺',
      itemIds: row.item_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ boards }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ boards: [] }, { status: 200, headers: corsHeaders });
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') || '';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
