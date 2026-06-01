import { NextRequest } from 'next/server';
import { getEnrichmentSignals } from '@/lib/enrichSignals';

export async function POST(req: NextRequest) {
  let location: string, startDate: string, days: number;
  try {
    ({ location, startDate, days } = await req.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!location || !startDate) {
    return new Response('location and startDate are required', { status: 400 });
  }

  const signals = await getEnrichmentSignals(location, startDate, days ?? 3);
  return Response.json(signals);
}
