'use client';

import Link from 'next/link';
import { MapPin, Clock, Banknote } from 'lucide-react';
import { Activity } from '@/lib/types';

interface TimelineActivityProps {
  activity: Activity;
  index: number;
  isLast: boolean;
  thumbnail?: string;      // from matching saved clip
  boardId?: string;        // for map deep-link
}

export default function TimelineActivity({
  activity,
  index,
  isLast,
  thumbnail,
  boardId,
}: TimelineActivityProps) {
  const mapHref =
    boardId
      ? `/?flyTo=${activity.location.lat},${activity.location.lng}&boardId=${boardId}`
      : `/?flyTo=${activity.location.lat},${activity.location.lng}`;

  return (
    <div className="flex gap-0">
      {/* ── Left rail: time + line ── */}
      <div className="flex flex-col items-center" style={{ width: 56, flexShrink: 0 }}>
        {/* Time badge */}
        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md whitespace-nowrap leading-tight">
          {activity.time}
        </span>
        {/* Dot */}
        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
        {/* Connecting line to next item */}
        {!isLast && (
          <div className="flex-1 w-px bg-indigo-100 mt-1" style={{ minHeight: 20 }} />
        )}
      </div>

      {/* ── Right content card ── */}
      <div className={`flex-1 min-w-0 ml-3 ${isLast ? 'pb-2' : 'pb-4'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Thumbnail */}
          {thumbnail && (
            <img
              src={thumbnail}
              alt={activity.name}
              className="w-full h-28 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <div className="p-3 space-y-1.5">
            {/* Location + duration row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <MapPin size={12} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <Link
                  href={mapHref}
                  className="text-xs font-semibold text-indigo-600 truncate hover:underline"
                >
                  {activity.location.name}
                </Link>
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

            {/* Activity name */}
            <p className="text-sm font-medium text-gray-800 leading-snug">
              {activity.name}
            </p>

            {/* Generic tips */}
            {activity.tips.length > 0 && (
              <ul className="space-y-0.5">
                {activity.tips.slice(0, 2).map((tip, i) => (
                  <li key={i} className="text-xs text-gray-500 leading-snug">
                    · {tip}
                  </li>
                ))}
              </ul>
            )}

            {/* Sourced tips — wisdom cited from user's clips */}
            {activity.sourcedTips && activity.sourcedTips.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {activity.sourcedTips.map((st, i) => (
                  <div
                    key={i}
                    className="bg-emerald-50 rounded-xl px-2.5 py-2 border-l-2 border-emerald-300"
                  >
                    <p className="text-xs text-emerald-900 leading-snug">💡 {st.content}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5 truncate">
                      from your clip: {st.sourceTitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
