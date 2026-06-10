import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { models } from '@/lib/models';

export async function POST(req: NextRequest) {
  const { boardName, boardEmoji, items } = await req.json() as {
    boardName: string;
    boardEmoji: string;
    items: { title: string; tags: string[]; substance: { type: string; content: string }[] }[];
  };

  if (!items || items.length === 0) {
    return new Response('Not enough clips', { status: 400 });
  }

  const contentLines = items.slice(0, 20).map((item) => {
    const tips = item.substance?.slice(0, 2).map((s) => s.content).join('; ') ?? '';
    const tags = item.tags?.slice(0, 3).join(', ') ?? '';
    return `- "${item.title}"${tags ? ` [${tags}]` : ''}${tips ? `: ${tips}` : ''}`;
  }).join('\n');

  const prompt = `You are summarizing a travel inspiration board for a user.

Board: ${boardEmoji} ${boardName}
Clips (${items.length} total, showing top ${Math.min(items.length, 20)}):
${contentLines}

Write exactly 2 sentences that capture the essence of this board. Focus on the vibe, the type of experiences, and what makes this collection distinctive. Be vivid and specific — mention actual places or themes from the clips. Write in second person ("Your...") so it feels personal.`;

  const result = await streamText({
    model: models.enrichment,
    prompt,
  });

  return result.toTextStreamResponse();
}
