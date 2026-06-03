import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { models } from '@/lib/models';

interface AskItemSummary {
  id: string;
  title: string;
  platform: string;
  locations: Array<{ name: string; lat: number; lng: number }>;
  substance: Array<{ type: string; content: string }>;
  tags: string[];
  savedAt: number;
}

interface AskRequestBody {
  question: string;
  items: AskItemSummary[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskRequestBody;
    const { question, items } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: 'question required' }, { status: 400 });
    }

    // Build a compact context from saved items
    const context = items
      .slice(0, 60) // cap to avoid token blowout
      .map((item) => {
        const date = new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const locs = item.locations.map((l) => l.name).join(', ');
        const substance = item.substance
          .filter((s) => s.type !== 'context')
          .slice(0, 3)
          .map((s) => `[${s.type}] ${s.content}`)
          .join(' | ');
        return `• "${item.title}" (saved ${date}, ${item.platform})${locs ? ` — 📍 ${locs}` : ''}${substance ? `\n  ${substance}` : ''}`;
      })
      .join('\n');

    const prompt = `You are a knowledgeable travel assistant with access to the user's saved travel clips.
Answer their question in a friendly, specific way. Cite relevant clips by title when they inform your answer.
Keep your response to 2–4 paragraphs. If none of the clips are relevant, say so honestly.

User's saved clips:
${context || '(no clips saved yet)'}

Question: ${question}`;

    const { text } = await generateText({
      model: models.vision, // sonnet — good reasoning, fast
      prompt,
      maxTokens: 600,
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error('[ask] error:', err);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}
