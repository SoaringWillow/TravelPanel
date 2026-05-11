import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SavedItem } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let items: SavedItem[], days: number, preferences: string;
  try {
    ({ items, days, preferences } = await req.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return new Response('No items provided', { status: 400 });
  }

  const summary = items.map((item) => ({
    title: item.title,
    platform: item.platform,
    locations: item.locations,
    activities: item.activities,
    tags: item.tags,
  }));

  const prompt = `You are an expert travel route planner. Create an optimized ${days}-day trip itinerary based on the saved travel inspirations below.

Saved travel content:
${JSON.stringify(summary, null, 2)}

User preferences: ${preferences || 'None specified'}

Create a detailed itinerary. Return ONLY valid JSON with no markdown and no explanation, exactly this shape:
{
  "overview": "1-2 sentence trip overview",
  "totalLocations": 5,
  "estimatedDailyDistance": "5-10 km",
  "days": [
    {
      "day": 1,
      "theme": "Arrival & Old Town Exploration",
      "locations": [
        { "name": "Place Name", "lat": 35.6762, "lng": 139.6503, "address": "optional" }
      ],
      "activities": [
        {
          "time": "09:00",
          "location": { "name": "Place Name", "lat": 35.6762, "lng": 139.6503 },
          "name": "Activity name",
          "duration": "2 hours",
          "tips": ["Arrive early to avoid crowds", "Wear comfortable shoes"]
        }
      ]
    }
  ],
  "tips": ["General trip tip 1", "General trip tip 2"]
}

Planning principles:
- Cluster geographically nearby places on the same day to minimise travel
- Balance activity types across each day (sightseeing, food, relaxation)
- Include realistic travel time between locations
- Suggest morning/afternoon/evening activities with appropriate timing
- Focus on routes and activities only — do NOT mention bookings, reservations, or costs
- If locations span multiple cities, organise by city
- Add 2-4 activities per day, not more`;

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
