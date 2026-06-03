import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

const suggestedCollectionSchema = z.object({
  collections: z.array(
    z.object({
      name:    z.string().describe('Short board name, 2–4 words'),
      emoji:   z.string().describe('Single emoji that represents the theme'),
      theme:   z.string().describe('One sentence describing the common thread'),
      itemIds: z.array(z.string()).describe('IDs of items that belong to this collection'),
    })
  ).min(1).max(5),
});

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as {
      items: Array<{ id: string; title: string; description?: string; tags: string[]; activities: string[] }>;
    };

    if (!items || items.length < 5) {
      return NextResponse.json({ collections: [] });
    }

    const itemSummaries = items.map((i) => ({
      id:          i.id,
      title:       i.title,
      description: i.description?.slice(0, 120) ?? '',
      tags:        i.tags.slice(0, 4),
      activities:  i.activities.slice(0, 3),
    }));

    const prompt = `You are a travel collection curator. Given these saved travel clips, suggest 3–5 meaningful collection themes.

Rules:
- Each collection must have at least 3 items from the list
- Collections should be meaningfully distinct (not "Asia" vs "East Asia")
- Use vivid, specific names like "Hidden Ryokan Retreats" not "Japan Hotels"
- Only use the item IDs provided — do not invent new ones
- Skip items that don't clearly fit any theme rather than forcing them in

Saved clips:
${JSON.stringify(itemSummaries, null, 2)}`;

    const { object } = await generateObject({
      model:  models.planCluster,
      schema: suggestedCollectionSchema,
      prompt,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('[cluster]', err);
    return NextResponse.json({ error: 'Clustering failed' }, { status: 500 });
  }
}
