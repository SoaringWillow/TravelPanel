'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, MessageSquare, Share2, Download } from 'lucide-react';
import { getTripById, updateTripTimeline } from '@/lib/db';
import type { Trip, Activity, ActivityLog, ActivityStatus, ActualTimeline } from '@/lib/types';

interface LoggedStop {
  activity: Activity;
  dayNum: number;
  dayTheme: string;
  key: string;
}

function buildStops(trip: Trip): LoggedStop[] {
  const stops: LoggedStop[] = [];
  trip.plan?.days.forEach((day) => {
    day.activities.forEach((activity, aIdx) => {
      stops.push({
        activity,
        dayNum: day.day,
        dayTheme: day.theme,
        key: `d${day.day}_a${aIdx}`,
      });
    });
  });
  return stops;
}

function initLogs(stops: LoggedStop[], existing?: ActualTimeline): Map<string, ActivityLog> {
  const map = new Map<string, ActivityLog>();
  stops.forEach((s) => {
    const found = existing?.logs.find((l) => l.key === s.key);
    map.set(s.key, found ?? { key: s.key, status: 'pending' });
  });
  return map;
}

function drawSummaryCanvas(
  trip: Trip,
  stops: LoggedStop[],
  logs: Map<string, ActivityLog>
): HTMLCanvasElement {
  const W = 600;
  const ROW_H = 52;
  const HEADER_H = 160;
  const FOOTER_H = 60;
  const H = HEADER_H + stops.length * ROW_H + FOOTER_H + 20;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(0, 0, W, H);

  // Header gradient
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#4338CA');
  grad.addColorStop(1, '#6366F1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  const visited = stops.filter((s) => logs.get(s.key)?.status === 'visited').length;
  const total = stops.length;

  ctx.fillStyle = 'white';
  ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
  ctx.fillText(trip.boardName, 40, 58);

  ctx.font = '18px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${visited} of ${total} places visited`, 40, 90);

  // Progress bar
  const barW = W - 80;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 40, 112, barW, 14, 7);
  ctx.fill();
  if (total > 0) {
    ctx.fillStyle = 'white';
    roundRect(ctx, 40, 112, Math.max(14, (visited / total) * barW), 14, 7);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '13px -apple-system, system-ui, sans-serif';
  ctx.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), 40, 146);

  // Activity rows
  let y = HEADER_H + 10;
  let lastDay = -1;

  for (const stop of stops) {
    if (stop.dayNum !== lastDay) {
      lastDay = stop.dayNum;
      ctx.fillStyle = '#6366F1';
      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.fillText(`Day ${stop.dayNum} — ${stop.dayTheme}`, 40, y + 20);
      y += 32;
    }

    const log = logs.get(stop.key);
    const status = log?.status ?? 'pending';

    // Row background
    ctx.fillStyle = status === 'visited' ? '#F0FDF4' : status === 'skipped' ? '#FFF7F7' : '#FFFFFF';
    ctx.fillRect(20, y, W - 40, ROW_H - 4);

    // Status icon
    const iconX = 42, iconY = y + (ROW_H - 4) / 2;
    ctx.beginPath();
    ctx.arc(iconX, iconY, 11, 0, Math.PI * 2);
    ctx.fillStyle = status === 'visited' ? '#22C55E' : status === 'skipped' ? '#EF4444' : '#D1D5DB';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(status === 'visited' ? '✓' : status === 'skipped' ? '✕' : '·', iconX, iconY + 5);
    ctx.textAlign = 'left';

    // Name
    ctx.fillStyle = '#1F2937';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    const name = stop.activity.location.name;
    ctx.fillText(name.length > 36 ? name.slice(0, 35) + '…' : name, 64, y + 22);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillText(stop.activity.time, 64, y + 40);

    // Note
    if (log?.note) {
      ctx.fillStyle = '#6B7280';
      ctx.font = 'italic 11px -apple-system, system-ui, sans-serif';
      const note = log.note.length > 50 ? log.note.slice(0, 49) + '…' : log.note;
      ctx.fillText(`"${note}"`, 64, y + 40);
    }

    y += ROW_H;
  }

  // Footer
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(20, H - FOOTER_H, W - 40, 1);
  ctx.fillStyle = '#6B7280';
  ctx.font = '13px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Clipped & planned with TravelPanel', W / 2, H - FOOTER_H + 30);
  ctx.textAlign = 'left';

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<LoggedStop[]>([]);
  const [logs, setLogs] = useState<Map<string, ActivityLog>>(new Map());
  const [noteKey, setNoteKey] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sharing, setSharing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getTripById(tripId).then((t) => {
      if (!t?.plan) return;
      setTrip(t);
      const s = buildStops(t);
      setStops(s);
      setLogs(initLogs(s, t.actualTimeline));
    });
  }, [tripId]);

  const persistLogs = useCallback(
    (nextLogs: Map<string, ActivityLog>) => {
      if (!trip) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateTripTimeline(tripId, { logs: Array.from(nextLogs.values()) });
      }, 600);
    },
    [trip, tripId]
  );

  function setStatus(key: string, status: ActivityStatus) {
    setLogs((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { key, status: 'pending' };
      const updated = { ...existing, status };
      next.set(key, updated);
      persistLogs(next);
      return next;
    });
  }

  function saveNote(key: string) {
    setLogs((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { key, status: 'pending' };
      const updated = { ...existing, note: noteText.trim() || undefined };
      next.set(key, updated);
      persistLogs(next);
      return next;
    });
    setNoteKey(null);
    setNoteText('');
  }

  async function handleShare() {
    if (!trip) return;
    setSharing(true);
    try {
      const canvas = drawSummaryCanvas(trip, stops, logs);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${trip.boardName}-trip.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${trip.boardName} Trip` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${trip.boardName}-trip-summary.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } finally {
      setSharing(false);
    }
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const visited = stops.filter((s) => logs.get(s.key)?.status === 'visited').length;
  const total = stops.length;
  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;

  // Group stops by day
  const dayGroups = stops.reduce<Map<number, { theme: string; stops: LoggedStop[] }>>(
    (acc, s) => {
      if (!acc.has(s.dayNum)) acc.set(s.dayNum, { theme: s.dayTheme, stops: [] });
      acc.get(s.dayNum)!.stops.push(s);
      return acc;
    },
    new Map()
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-500 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{trip.boardName}</h1>
            <p className="text-white/70 text-xs">Trip Log</p>
          </div>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform disabled:opacity-50"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{visited}<span className="text-lg font-normal text-white/70"> / {total}</span></span>
            <span className="text-white/80 text-sm font-medium">{pct}% visited</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="flex-1 px-4 py-4 pb-24 space-y-6">
        {Array.from(dayGroups.entries()).map(([dayNum, { theme, stops: dayStops }]) => (
          <div key={dayNum}>
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
              Day {dayNum} — {theme}
            </h2>
            <div className="space-y-2">
              {dayStops.map((stop) => {
                const log = logs.get(stop.key);
                const status = log?.status ?? 'pending';
                return (
                  <div key={stop.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      {/* Time */}
                      <span className="flex-shrink-0 text-xs text-gray-400 font-medium pt-0.5 w-12">
                        {stop.activity.time}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">
                          {stop.activity.location.name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">{stop.activity.name}</p>
                        {log?.note && (
                          <p className="text-xs text-indigo-600 italic mt-1">"{log.note}"</p>
                        )}
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setStatus(stop.key, status === 'visited' ? 'pending' : 'visited')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            status === 'visited'
                              ? 'bg-green-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(stop.key, status === 'skipped' ? 'pending' : 'skipped')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            status === 'skipped'
                              ? 'bg-red-400 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400'
                          }`}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNoteText(log?.note ?? '');
                            setNoteKey(noteKey === stop.key ? null : stop.key);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            log?.note
                              ? 'bg-indigo-100 text-indigo-500'
                              : 'bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-400'
                          }`}
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Inline note input */}
                    {noteKey === stop.key && (
                      <div className="px-3 pb-3 pt-0 flex items-center gap-2 border-t border-gray-50">
                        <input
                          autoFocus
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNote(stop.key);
                            if (e.key === 'Escape') { setNoteKey(null); setNoteText(''); }
                          }}
                          placeholder="Add a note…"
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => saveNote(stop.key)}
                          className="text-xs text-indigo-600 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-50 active:scale-95 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Share button (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Download size={15} />
          {sharing ? 'Preparing…' : 'Export Summary'}
        </button>
      </div>
    </div>
  );
}
