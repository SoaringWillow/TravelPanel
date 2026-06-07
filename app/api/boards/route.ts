import { NextResponse } from 'next/server';

// Returns board list for the browser extension popup.
// Without Supabase (B1), boards live only in IndexedDB (client-side) so this
// returns an empty array. Once B1 cloud sync is active, this route will query
// Supabase and return the authenticated user's boards.
export async function GET() {
  return NextResponse.json(
    { boards: [] },
    {
      headers: {
        // Allow the browser extension to call this endpoint cross-origin
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
