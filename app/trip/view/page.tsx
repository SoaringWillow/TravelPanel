'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowLeft, Share2 } from 'lucide-react';
import { decodePlan } from '@/lib/sharePlan';
import { TripPlan } from '@/lib/types';

function TripViewInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ boardName: string; boardEmoji: string; days: number; plan: TripPlan } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    const encoded = searchParams.get('d');
    if (!encoded) { setInvalid(true); return; }
    const decoded = decodePlan(encoded);
    if (!decoded) { setInvalid(true); return; }
    setData(decoded);
  }, [searchParams]);

  async function handleShare() {
    const url  = window.location.href;
    const text = data ? `${data.boardEmoji} ${data.boardName} — ${data.days}-day trip plan` : 'Trip plan from TravelPanel';
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (invalid) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
        <div className="text-5xl">🗺️</div>
        <h1 className="text-xl font-bold text-gray-800">Trip not found</h1>
        <p className="text-sm text-gray-500">This link may be expired or invalid.</p>
        <a href="/" className="text-sm text-indigo-600 font-medium hover:underline">
          Open TravelPanel
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const { boardName, boardEmoji, days, plan } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
          >
            <Share2 size={15} />
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 text-white"
        >
          <div className="text-5xl mb-3">{boardEmoji}</div>
          <h1 className="text-2xl font-bold mb-1">{boardName}</h1>
          <div className="flex items-center gap-3 text-indigo-100 text-sm">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {days} day{days !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {plan.totalLocations} place{plan.totalLocations !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-3 text-sm text-indigo-100 leading-relaxed">{plan.overview}</p>
        </motion.div>

        {/* Days */}
        {plan.days.map((day, di) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * di }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Day header */}
            <div className="bg-indigo-50 dark:bg-indigo-950/50 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                  Day {day.day}
                </h2>
              </div>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">{day.theme}</p>
            </div>

            {/* Activities */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {day.activities.map((act, ai) => (
                <div key={ai} className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {act.type === 'meal' ? '🍽️' :
                       act.type === 'transport' ? '🚇' :
                       act.type === 'accommodation' ? '🏨' :
                       act.type === 'rest' ? '☕' : '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {act.title}
                        </h3>
                        {act.time && (
                          <span className="text-xs text-gray-400">{act.time}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {act.description}
                      </p>
                      {act.tips && act.tips.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {act.tips.map((tip, ti) => (
                            <p key={ti} className="text-xs text-amber-700 dark:text-amber-400">
                              💡 {tip}
                            </p>
                          ))}
                        </div>
                      )}
                      {act.source && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          From: {act.source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Tips */}
        {plan.tips && plan.tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 space-y-2"
          >
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              ✈️ Trip Tips
            </p>
            {plan.tips.map((tip, i) => (
              <p key={i} className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                • {tip}
              </p>
            ))}
          </motion.div>
        )}

        {/* TravelPanel CTA */}
        <div className="flex flex-col items-center py-6 gap-3">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Plan your own trip with TravelPanel
          </p>
          <a
            href="/"
            className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg"
          >
            ✈️ Open TravelPanel
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TripViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <TripViewInner />
    </Suspense>
  );
}
