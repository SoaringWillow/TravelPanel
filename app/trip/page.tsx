'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { decodeSharedTrip } from '@/lib/shareTrip';
import { SavedItem } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

function TripPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('p') ?? '';
  const payload = token ? decodeSharedTrip(token) : null;

  if (!payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🗺</div>
        <h1 className="text-xl font-bold text-gray-800">Trip not found</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          This link may be invalid or expired. Ask the sender to share it again.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-indigo-600 text-sm font-medium"
        >
          Open TravelPanel
        </button>
      </div>
    );
  }

  const { name, emoji, plan } = payload;

  // Build pseudo SavedItems for the MapView — one per unique location
  const allLocations = plan.days.flatMap((d) => d.locations);
  const uniqueLocs = allLocations.filter(
    (l, i) => allLocations.findIndex((x) => x.name === l.name) === i
  );

  const pseudoItems: SavedItem[] = uniqueLocs.map((loc, idx) => ({
    id: `shared-${idx}`,
    url: '',
    platform: 'other',
    title: loc.name,
    description: '',
    thumbnail: undefined,
    locations: [loc],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    enrichmentStatus: 'done',
    retryCount: 0,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Map */}
      <div className="h-64 relative flex-shrink-0 bg-gray-200">
        <MapView items={pseudoItems} onPinClick={() => {}} />
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm px-4 safe-top pb-4 z-10 -mt-px">
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-2xl">{emoji}</span>
          <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{name}</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-8">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {plan.days.length} day{plan.days.length !== 1 ? 's' : ''}
          </span>
          {plan.totalLocations !== undefined && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {plan.totalLocations} location{plan.totalLocations !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-6 pb-16 max-w-2xl mx-auto w-full">
        {/* Overview */}
        {plan.overview && (
          <p className="text-sm text-gray-600 italic leading-relaxed">{plan.overview}</p>
        )}

        {/* Days */}
        {plan.days.map((day) => (
          <div key={day.day} className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">
              Day {day.day} — {day.theme}
            </h2>

            {day.activities.map((act, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{act.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />
                      {act.location.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-xs font-medium text-indigo-600">{act.time}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Clock size={10} />
                      {act.duration}
                    </span>
                  </div>
                </div>

                {/* Sourced tips */}
                {(act.sourcedTips?.length ?? 0) > 0 && (
                  <div className="space-y-1 pt-1 border-t border-gray-100">
                    {act.sourcedTips!.map((tip, ti) => (
                      <div key={ti} className="flex gap-2">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">💡</span>
                        <div>
                          <p className="text-xs text-gray-700 leading-relaxed">{tip.content}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">From: {tip.sourceTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generic tips (no source) */}
                {(act.tips?.length ?? 0) > 0 && !(act.sourcedTips?.length) && (
                  <ul className="text-xs text-gray-500 space-y-0.5 pt-1 border-t border-gray-100 pl-3 list-disc">
                    {act.tips.map((tip, ti) => (
                      <li key={ti}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Tips */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">General tips</h2>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm space-y-2">
              {plan.tips.map((tip, i) => (
                <p key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-indigo-400">•</span>
                  {tip}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-indigo-50 rounded-2xl px-4 py-4 text-center space-y-2">
          <p className="text-sm font-semibold text-indigo-800">Plan your own trip</p>
          <p className="text-xs text-indigo-600">Clip inspiration from any app and let AI build your itinerary.</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Open TravelPanel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <TripPageInner />
    </Suspense>
  );
}
