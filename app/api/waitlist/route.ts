import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }
  // TODO: insert into Supabase `waitlist` table when E1 is activated
  // const { error } = await supabase.from('waitlist').insert({ email, source: 'pro_gate' });
  return NextResponse.json({ ok: true });
}
