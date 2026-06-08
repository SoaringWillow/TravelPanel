'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { decodeSharedBoard, importSharedBoard, SharedBoardPayload } from '@/lib/shareBoard';
import { SavedItem, Location } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Convert SharedBoardPayload items into pseudo-SavedItems for MapView ─────

function toMapItems(payload: SharedBoardPayload): SavedItem[] {
  return payload.i.map((si, idx) => ({
    id:              `shared-${idx}`,
    url:             si.u,
    title:           si.t,
    platform:        'other' as const,
    description:     '',
    thumbnail:       si.th,
    locations:       si.l.map((l) => ({ name: l.n, lat: l.la, lng: l.lo })),
    activities:      [],
    tags:            si.g,
    substance:       [],
    savedAt:         Date.now(),
    enrichmentStatus: 'done' as const,
    retryCount:      0,
  }));
}

// ─── Inner view ───────────────────────────────────────────────────────────────

function SharedBoardViewInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('b') ?? '';

  const payload  = token ? decodeSharedBoard(token) : null;
  const mapItems = payload ? toMapItems(payload) : [];

  const [flyTo, setFlyTo]         = useState<Location | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(false);

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6 gap-4">
        <div className="text-5xl">🗺</div>
        <h1 className="text-xl font-bold text-gray-800">Board not found</h1>
        <p className="text-sm text-gray-500">This share link may have expired or is invalid.</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
        >
          Open TravelPanel
        </button>
      </div>
    );
  }

  async function handleImport() {
    if (!payload) return;
    setImporting(true);
    try {
      await importSharedBoard(payload);
      setImported(true);
    } finally {
      setImporting(false);
    }
  }

  const totalLocations = payload.i.reduce((s, i) => s + i.l.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 safe-top pb-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{payload.e}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 truncate">{payload.n}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {payload.i.length} clip{payload.i.length !== 1 ? 's' : ''} · {totalLocations} location{totalLocations !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">Shared board</span>
        </div>
      </div>

      {/* Mini map */}
      {mapItems.length > 0 && (
        <div className="relative w-full bg-gray-200" style={{ height: 220 }}>
          <MapView
            items={mapItems}
            onPinClick={(item) => {
              if (item.locations.length > 0) setFlyTo(item.locations[0]);
            }}
            flyTo={flyTo}
          />
        </div>
      )}

      {/* Import CTA */}
      <div className="px-4 py-4">
        {imported ? (
          <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 font-semibold py-3.5 rounded-2xl text-sm">
            <CheckCircle2 size={18} />
            Added to your TravelPanel!
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => router.push('/boards')}
            >
              View boards →
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200 disabled:opacity-60"
          >
            {importing ? 'Importing…' : `✈️ Add "${payload.n}" to my TravelPanel`}
          </button>
        )}
      </div>

      {/* Clip list */}
      <div className="flex-1 px-4 pb-10">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Places in this board</p>
        <div className="flex flex-col gap-3">
          {payload.i.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {item.th ? (
                    <img src={item.th} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">
                      {item.g[0] === 'food' ? '🍜' : item.g[0] === 'beach' ? '🏖' : item.g[0] === 'mountain' ? '🏔' : item.g[0] === 'nature' ? '🌿' : '📌'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.t}</p>
                  {item.l.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {item.l.map((loc) => (
                        <button
                          key={loc.n}
                          type="button"
                          onClick={() => setFlyTo({ name: loc.n, lat: loc.la, lng: loc.lo })}
                          className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <MapPin size={9} />
                          {loc.n}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.g.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.g.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SharedBoardViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <SharedBoardViewInner />
    </Suspense>
  );
}
