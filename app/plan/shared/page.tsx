'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Calendar, Lightbulb, ChevronRight, Banknote } from 'lucide-react';
import { TripPlan, DayPlan } from '@/lib/types';
import { decodePlan } from '@/lib/sharePlan';

const DAY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function SharedPlanPage() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError('No plan found in this link.');
      return;
    }
    decodePlan(hash)
      .then(setPlan)
      .catch(() => setError('This link is invalid or the plan data is corrupted.'));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">🗺</div>
          <p className="text-gray-700 font-semibold">{error}</p>
          <Link href="/" className="text-indigo-600 text-sm hover:underline">
            Open TravelPanel
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const activeDay: DayPlan | undefined = plan.days?.[activeDayIndex];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-safe-top">
        <div className="max-w-lg mx-auto py-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺</span>
            <h1 className="text-xl font-bold text-gray-900">Trip Plan</h1>
            <Link
              href="/"
              className="ml-auto text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              Open TravelPanel
              <ChevronRight size={13} />
            </Link>
          </div>
          <p className="text-sm text-gray-500 leading-snug">{plan.overview}</p>
          <div className="flex gap-3 text-xs text-gray-400 pt-0.5">
            <span className="flex items-center gap-1"><Calendar size={12} />{plan.days?.length} days</span>
            <span className="flex items-center gap-1"><MapPin size={12} />{plan.totalLocations} locations</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Day strip */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2" style={{ width: 'max-content' }}>
            {plan.days?.map((day, idx) => (
              <button
                key={day.day}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-left transition-all ${
                  activeDayIndex === idx
                    ? 'text-white shadow-md'
                    : 'bg-white border border-gray-100 text-gray-700'
                }`}
                style={activeDayIndex === idx ? { backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] } : {}}
              >
                <p className="text-xs font-bold">Day {day.day}</p>
                <p className={`text-[11px] mt-0.5 ${activeDayIndex === idx ? 'text-white/80' : 'text-gray-400'}`}>
                  {day.theme}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Active day activities */}
        {activeDay && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-bold text-gray-700">
                Day {activeDayIndex + 1} — {activeDay.theme}
              </h2>
              {activeDay.dailyCostEstimate && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">
                  Est. {activeDay.dailyCostEstimate}
                </span>
              )}
            </div>

            {activeDay.activities.map((activity, aIdx) => (
              <div key={aIdx} className="flex gap-0">
                {/* Left rail */}
                <div className="flex flex-col items-center" style={{ width: 56, flexShrink: 0 }}>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md whitespace-nowrap leading-tight">
                    {activity.time}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  {aIdx < activeDay.activities.length - 1 && (
                    <div className="flex-1 w-px bg-indigo-100 mt-1" style={{ minHeight: 20 }} />
                  )}
                </div>

                {/* Right card */}
                <div className={`flex-1 min-w-0 ml-3 ${aIdx < activeDay.activities.length - 1 ? 'pb-4' : 'pb-2'}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin size={12} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-indigo-600 truncate">
                          {activity.location.name}
                        </span>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {activity.estimatedCost && (
                          <span className="flex items-center gap-0.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            <Banknote size={11} />
                            {activity.estimatedCost}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
                          <Clock size={11} />
                          {activity.duration}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-gray-800 leading-snug">{activity.name}</p>

                    {activity.tips.length > 0 && (
                      <ul className="space-y-0.5">
                        {activity.tips.slice(0, 2).map((tip, i) => (
                          <li key={i} className="text-xs text-gray-500 leading-snug">· {tip}</li>
                        ))}
                      </ul>
                    )}

                    {activity.sourcedTips && activity.sourcedTips.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {activity.sourcedTips.map((st, i) => (
                          <div key={i} className="bg-emerald-50 rounded-xl px-2.5 py-2 border-l-2 border-emerald-300">
                            <p className="text-xs text-emerald-900 leading-snug">💡 {st.content}</p>
                            <p className="text-[10px] text-emerald-600 mt-0.5 truncate">
                              from: {st.sourceTitle}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trip tips */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">Trip Tips</span>
            </div>
            <ul className="space-y-1">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-800 leading-snug">· {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="bg-indigo-50 rounded-2xl p-4 text-center space-y-2 border border-indigo-100">
          <p className="text-sm font-semibold text-indigo-900">
            Build your own AI trip plan
          </p>
          <p className="text-xs text-indigo-700">
            Save inspiration from any social app, then let AI turn it into a personalised itinerary.
          </p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Try TravelPanel free
          </Link>
        </div>

      </div>
    </div>
  );
}
