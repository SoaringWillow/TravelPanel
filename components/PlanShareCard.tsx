'use client';

import { useRef } from 'react';
import { Share2, Download } from 'lucide-react';
import { TripPlan } from '@/lib/types';

interface PlanShareCardProps {
  plan: TripPlan;
  boardName: string;
  boardEmoji: string;
}

// Renders a shareable summary card and lets the user download or share it.
// Uses the native navigator.share API on iOS; falls back to anchor download.
export default function PlanShareCard({ plan, boardName, boardEmoji }: PlanShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    const card = cardRef.current;
    if (!card) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'trip-plan.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `${boardEmoji} ${boardName} trip plan` });
            return;
          } catch { /* cancelled — fall through to download */ }
        }

        // Fallback: download PNG
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${boardName.replace(/\s+/g, '-')}-trip-plan.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      // html2canvas not available — show basic share fallback
      if (navigator.share) {
        await navigator.share({ title: `${boardEmoji} ${boardName}`, text: buildTextSummary(plan, boardName) });
      }
    }
  }

  const top5 = plan.days.flatMap((d) => d.activities.map((a) => a.location.name)).slice(0, 5);

  return (
    <div className="space-y-3">
      {/* The shareable card (rendered off-screen area but visible to user as preview) */}
      <div
        ref={cardRef}
        style={{ fontFamily: 'system-ui, sans-serif', background: '#ffffff', borderRadius: 20, overflow: 'hidden', width: 320 }}
        className="mx-auto shadow-2xl"
      >
        {/* Header strip */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '16px 20px' }}>
          <p style={{ color: 'white', fontSize: 22, margin: 0 }}>{boardEmoji}</p>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '4px 0 2px' }}>{boardName}</p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: 0 }}>
            {plan.days.length} days · {plan.totalLocations ?? top5.length} locations
          </p>
        </div>

        {/* Location list */}
        <div style={{ padding: '16px 20px', background: '#f8faff' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 0 }}>
            Top highlights
          </p>
          {top5.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i + 1}
              </div>
              <p style={{ fontSize: 13, color: '#1f2937', margin: 0, fontWeight: 500 }}>{name}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', background: '#fff', borderTop: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, margin: 0 }}>TravelPanel</p>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Planned with AI ✨</p>
        </div>
      </div>

      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md"
      >
        <Share2 size={15} />
        Share plan
      </button>
    </div>
  );
}

function buildTextSummary(plan: TripPlan, boardName: string): string {
  const top = plan.days.flatMap((d) => d.activities.map((a) => a.location.name)).slice(0, 5);
  return `${boardName} — ${plan.days.length}-day trip plan\n\nTop places:\n${top.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nPlanned with TravelPanel`;
}
