import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';
import { SavedItem, Board } from '@/lib/types';

const autosortSchema = z.object({
  boardId: z.string().nullable().describe('The ID of the best-matching board, or null if none fit'),
  reason: z.string().describe('One sentence explaining why this board was chosen'),
});

export async function POST(req: NextRequest) {
  try {
    const { clip, boards }: { clip: SavedItem; boards: Board[] } = await req.json();

    if (!boards || boards.length === 0) {
      return NextResponse.json({ boardId: null, reason: 'No boards available' });
    }

    const boardDescriptions = boards
      .map((b) => `- ID: ${b.id} | Name: "${b.name}" | Emoji: ${b.emoji}`)
      .join('\n');

    const clipSummary = [
      `Title: ${clip.title}`,
      clip.description ? `Description: ${clip.description}` : '',
      clip.locations.length > 0
        ? `Locations: ${clip.locations.map((l) => l.name).join(', ')}`
        : '',
      clip.tags.length > 0 ? `Tags: ${clip.tags.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const { object } = await generateObject({
      model: models.enrichment,
      schema: autosortSchema,
      system:
        'You are a travel organizer. Given a saved travel clip and a list of the user\'s boards, determine which board the clip best belongs to. Use location names, destination context, and content to decide. Return null boardId if no board is a good fit (confidence below ~70%). Respond with JSON only.',
      prompt: `Travel clip:\n${clipSummary}\n\nUser's boards:\n${boardDescriptions}`,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('[autosort]', err);
    return NextResponse.json({ boardId: null, reason: 'Could not determine' });
  }
}
