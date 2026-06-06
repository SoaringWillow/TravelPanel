import { Metadata } from 'next';

interface Props {
  params: { id: string };
  searchParams: { preview?: string };
}

// In v1, board data is local-first (IndexedDB). The sharing flow (F2) writes
// a lightweight metadata snapshot to localStorage under `sharedBoardMeta:{id}`
// when the user taps Share. This client component reads it on load.
// When Supabase cloud sync is enabled (B1), this becomes a real server fetch.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'TravelPanel — Shared Board',
    description: 'A travel inspiration board shared from TravelPanel',
    openGraph: {
      title: 'TravelPanel — Shared Board',
      description: 'Explore this travel collection on TravelPanel',
      type: 'website',
    },
  };
}

export default function BoardPreviewPage({ params }: Props) {
  const { id } = params;

  return <BoardPreviewClient boardId={id} />;
}

// ─── Client component ──────────────────────────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Globe } from 'lucide-react';

interface SharedBoardMeta {
  id: string;
  name: string;
  emoji: string;
  itemCount: number;
  locationNames: string[];
  sharedAt: number;
}

function BoardPreviewClient({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<SharedBoardMeta | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sharedBoardMeta:${boardId}`);
      if (raw) {
        setMeta(JSON.parse(raw) as SharedBoardMeta);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
  }, [boardId]);

  function openInApp() {
    // Try Capacitor URL scheme first, fall back to web root
    window.location.href = `travelpanel://board/${boardId}`;
    setTimeout(() => router.push('/'), 600);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🗺</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Board not found</h1>
        <p className="text-sm text-gray-500 mb-6">
          This board may have been created on another device, or the link has expired.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="bg-indigo-600 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Open TravelPanel
        </button>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pt-16 pb-10 text-center text-white">
        <div className="text-6xl mb-3">{meta.emoji}</div>
        <h1 className="text-2xl font-bold mb-1">{meta.name}</h1>
        <p className="text-indigo-200 text-sm">{meta.itemCount} place{meta.itemCount !== 1 ? 's' : ''} saved</p>
      </div>

      {/* Location pills */}
      {meta.locationNames.length > 0 && (
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">Locations in this board</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.locationNames.map((name, i) => (
              <span
                key={i}
                className="bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full border border-indigo-100"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 pb-12 pt-2 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={openInApp}
          className="w-full max-w-sm bg-indigo-600 text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Globe size={20} />
          Open in TravelPanel
        </button>
        <p className="text-xs text-gray-400 text-center">
          Free travel inspiration clipper for iOS. Clip from Instagram, YouTube, 小红书, and more.
        </p>
      </div>
    </div>
  );
}
