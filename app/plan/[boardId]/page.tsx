'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Calendar, Route, Lightbulb, RotateCcw, X, Download, CalendarPlus } from 'lucide-react';
import { Board, SavedItem, AgentStep, TripPlan, PlanStreamMessage, Trip } from '@/lib/types';
import { getBoardById, getAllItems, getTripsForBoard, saveTrip, deleteTrip } from '@/lib/db';
import { checkPlanLimit, recordPlanGeneration, formatResetsIn } from '@/lib/rateLimits';
import { exportPlanToPDF, exportPlanToICS } from '@/lib/exportPlan';
import { track } from '@/lib/analytics';
import { tap as hapticTap } from '@/lib/haptics';
import { Slider } from '@/components/ui/slider';
import PlannerAgent from '@/components/PlannerAgent';
import DayStripCard from '@/components/DayStripCard';
import PlanVersionBar from '@/components/PlanVersionBar';

const RouteMapView = dynamic(() => import('@/components/RouteMapView'), { ssr: false });
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type Stage = 'idle' | 'generating' | 'complete';

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [boardItems, setBoardItems] = useState<SavedItem[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);

  const [stage, setStage] = useState<Stage>('idle');
  const [days, setDays] = useState(3);
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [customNotes, setCustomNotes] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [plan, setPlan] = useState<Partial<TripPlan> | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingBoard(true);
      try {
        const [b, allItems, trips] = await Promise.all([
          getBoardById(boardId),
          getAllItems(),
          getTripsForBoard(boardId),
        ]);
        if (b) {
          setBoard(b);
          const filtered = allItems.filter((item) => item.boardId === boardId);
          setBoardItems(filtered);
        }
        setSavedTrips(trips.sort((a, b) => a.createdAt - b.createdAt));
      } finally {
        setLoadingBoard(false);
      }
    }
    load();
  }, [boardId]);

  const itemsWithLocations = boardItems.filter((item) => item.locations.length > 0);
  const hasLocations = itemsWithLocations.length > 0;

  const generatePlan = useCallback(async () => {
    setPlanLimitError(null);
    const limit = checkPlanLimit();
    if (!limit.allowed) {
      setPlanLimitError(
        `You've used all ${5} free plans today. More plans available in ${formatResetsIn(limit.resetsAt)}. ` +
        `Unlimited plans coming in Pro — stay tuned!`
      );
      track('plan_limit_hit', { boardId });
      return;
    }

    setStage('generating');
    setSteps([]);
    setPlan(null);
    setActiveDayIndex(0);
    recordPlanGeneration();
    track('plan_generated', { boardId, days, itemCount: boardItems.length });

    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: boardItems,
        days,
        preferences: [
          ...Array.from(selectedChips),
          ...(customNotes.trim() ? [customNotes.trim()] : []),
        ].join('. '),
      }),
    });

    if (!res.ok || !res.body) {
      setStage('idle');
      return;
    }

    const reader = res.body.getReader();
    let buf = '';
    let latestPlan: Partial<TripPlan> | null = null;
    const collectedSteps: AgentStep[] = [];
    const prefs = [
      ...Array.from(selectedChips),
      ...(customNotes.trim() ? [customNotes.trim()] : []),
    ].join('. ');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += new TextDecoder().decode(value);
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as PlanStreamMessage;
          if (msg.t === 'step') {
            collectedSteps.push(msg.step);
            setSteps((s) => [...s, msg.step]);
            if (msg.step.type === 'done' || msg.step.type === 'error') {
              setStage(msg.step.type === 'done' ? 'complete' : 'idle');
            }
            // Persist the finished plan as a new named variant.
            if (msg.step.type === 'done' && latestPlan?.days?.length) {
              const trip: Trip = {
                id: crypto.randomUUID(),
                boardId,
                boardName: board?.name ?? '',
                name: `Plan ${savedTrips.length + 1}`,
                days,
                preferences: prefs,
                agentSteps: collectedSteps,
                plan: latestPlan as TripPlan,
                createdAt: Date.now(),
              };
              await saveTrip(trip);
              setSavedTrips((prev) => [...prev, trip]);
              setCurrentTripId(trip.id);
            }
          }
          if (msg.t === 'plan') {
            latestPlan = msg.plan as Partial<TripPlan>;
            setPlan(latestPlan);
          }
        } catch {
          // skip bad lines
        }
      }
    }
  }, [boardItems, days, selectedChips, customNotes, board, boardId, savedTrips.length]);

  const handleCancel = useCallback(() => {
    setStage('idle');
  }, []);

  const handleStartOver = useCallback(() => {
    setStage('idle');
    setSteps([]);
    setPlan(null);
    setActiveDayIndex(0);
    setSelectedChips(new Set());
    setCustomNotes('');
  }, []);

  // Export is only meaningful for a fully-formed plan (days + activities present).
  const planIsComplete = (p: Partial<TripPlan> | null): p is TripPlan =>
    !!p && Array.isArray(p.days) && p.days.length > 0;

  const handleExportPDF = useCallback(async () => {
    if (!planIsComplete(plan) || !board) return;
    await exportPlanToPDF(plan, board.name, board.emoji);
    track('plan_exported', { format: 'pdf', boardId });
  }, [plan, board, boardId]);

  const handleExportICS = useCallback(() => {
    if (!planIsComplete(plan) || !board) return;
    exportPlanToICS(plan, board.name);
    track('plan_exported', { format: 'ics', boardId });
  }, [plan, board, boardId]);

  // Load a previously-saved plan variant into view.
  const loadTrip = useCallback((trip: Trip) => {
    if (!trip.plan) return;
    setPlan(trip.plan);
    setSteps(trip.agentSteps ?? []);
    setDays(trip.days);
    setActiveDayIndex(0);
    setCurrentTripId(trip.id);
    setStage('complete');
  }, []);

  const renameTrip = useCallback(async (tripId: string, name: string) => {
    const trip = savedTrips.find((t) => t.id === tripId);
    if (!trip) return;
    const updated = { ...trip, name };
    await saveTrip(updated);
    setSavedTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));
  }, [savedTrips]);

  const removeTrip = useCallback(async (tripId: string) => {
    await deleteTrip(tripId);
    setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
    if (currentTripId === tripId) setCurrentTripId(null);
  }, [currentTripId]);

  // "New version" — return to config (keeping preferences) to generate a fresh variant.
  const handleNewVersion = useCallback(() => {
    setStage('idle');
    setPlan(null);
    setActiveDayIndex(0);
    setCurrentTripId(null);
  }, []);

  function toggleChip(chip: string) {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  const CHIP_GROUPS: Array<{ label: string; chips: string[] }> = [
    { label: 'Pace',      chips: ['🐢 Easy & relaxed', '⚡ Packed schedule'] },
    { label: 'Transport', chips: ['🚶 Walking', '🚇 Transit', '🚗 Drive'] },
    { label: 'Food',      chips: ['🍜 Street food', '🍽 Sit-down', '☕ Café culture', '🌱 Plant-based'] },
    { label: 'Interests', chips: ['📸 Photography', '🏛 Culture', '🌿 Nature', '🛍 Shopping', '🎨 Art', '🌃 Nightlife', '🏖 Beach'] },
  ];

  const activeDayPlan = plan?.days?.[activeDayIndex] ?? null;

  if (loadingBoard) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
        <p className="text-gray-500 text-sm">Board not found.</p>
        <button
          onClick={() => router.back()}
          className="text-indigo-600 text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Top map section — always visible once stage != idle */}
      <div
        className="relative flex-shrink-0 bg-gray-200"
        style={{ height: stage === 'idle' ? '45vh' : '45vh' }}
      >
        {stage === 'idle' ? (
          <MapView items={boardItems} onPinClick={() => {}} />
        ) : (
          <RouteMapView
            items={boardItems}
            plan={plan}
            activeDayIndex={activeDayIndex}
          />
        )}
      </div>

      {/* Bottom scrollable panel */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="px-4 pb-8 pt-4">

          {/* ── PRE-GENERATE STATE ── */}
          {stage === 'idle' && (
            <div className="space-y-5">
              {/* Board header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <span className="text-2xl">{board.emoji}</span>
                <h1 className="text-lg font-bold text-gray-800 flex-1 truncate">{board.name}</h1>
                <span className="flex-shrink-0 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Days slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Calendar size={15} className="text-indigo-500" />
                    Trip length
                  </label>
                  <span className="text-sm font-bold text-indigo-600">{days} day{days !== 1 ? 's' : ''}</span>
                </div>
                <Slider
                  value={[days]}
                  onValueChange={(v) => setDays(v[0])}
                  min={1}
                  max={14}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1 day</span>
                  <span>14 days</span>
                </div>
              </div>

              {/* Preference chips */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Travel style</label>
                {CHIP_GROUPS.map(({ label, chips }) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) => {
                        const active = selectedChips.has(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleChip(chip)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                              active
                                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Anything else? e.g. avoid hills, travelling with kids…"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              {/* Warning if no locations */}
              {!hasLocations && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Add items with identified locations to plan a trip.</span>
                </div>
              )}

              {/* Plan rate limit warning */}
              {planLimitError && (
                <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-indigo-700">
                  <Lightbulb size={14} className="flex-shrink-0 mt-0.5 text-indigo-500" />
                  <span>{planLimitError}</span>
                </div>
              )}

              {/* Previously-saved plan versions — tap to reopen */}
              <PlanVersionBar
                trips={savedTrips}
                currentTripId={currentTripId}
                onSelect={loadTrip}
                onRename={renameTrip}
                onDelete={removeTrip}
                onNewVersion={handleNewVersion}
              />

              {/* Generate button */}
              <button
                onClick={() => { hapticTap(); generatePlan(); }}
                disabled={!hasLocations}
                className="w-full bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✨ Begin planning
              </button>
            </div>
          )}

          {/* ── GENERATING STATE ── */}
          {stage === 'generating' && (
            <div className="space-y-4">
              {/* Back / board name */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{board.emoji}</span>
                <span className="text-base font-bold text-gray-800 flex-1 truncate">{board.name}</span>
              </div>

              <PlannerAgent steps={steps} isRunning={stage === 'generating'} />

              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                <X size={15} />
                Cancel
              </button>
            </div>
          )}

          {/* ── COMPLETE STATE ── */}
          {stage === 'complete' && plan && (
            <div className="space-y-5">
              {/* Board header row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <span className="text-xl">{board.emoji}</span>
                <span className="text-base font-bold text-gray-800 flex-1 truncate">{board.name}</span>
              </div>

              {/* Overview */}
              {plan.overview && (
                <p className="text-sm italic text-gray-600 leading-relaxed">{plan.overview}</p>
              )}

              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                {plan.days && (
                  <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Calendar size={12} />
                    {plan.days.length} day{plan.days.length !== 1 ? 's' : ''}
                  </div>
                )}
                {plan.totalLocations !== undefined && (
                  <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <MapPin size={12} />
                    {plan.totalLocations} location{plan.totalLocations !== 1 ? 's' : ''}
                  </div>
                )}
                {plan.estimatedDailyDistance && (
                  <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Route size={12} />
                    ~{plan.estimatedDailyDistance}
                  </div>
                )}
              </div>

              {/* Export actions */}
              {planIsComplete(plan) && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                  <button
                    onClick={handleExportICS}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                  >
                    <CalendarPlus size={14} />
                    Add to Calendar
                  </button>
                </div>
              )}

              {/* Saved plan versions */}
              <PlanVersionBar
                trips={savedTrips}
                currentTripId={currentTripId}
                onSelect={loadTrip}
                onRename={renameTrip}
                onDelete={removeTrip}
                onNewVersion={handleNewVersion}
              />

              {/* Day strip */}
              {plan.days && plan.days.length > 0 && (
                <div className="overflow-x-auto pb-2 -mx-4 px-4">
                  <div className="flex gap-3" style={{ width: 'max-content' }}>
                    {plan.days.map((day, idx) => (
                      <DayStripCard
                        key={day.day}
                        day={day}
                        index={idx}
                        isActive={activeDayIndex === idx}
                        onSelect={() => setActiveDayIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active day activities */}
              {activeDayPlan && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-gray-700">
                    Day {activeDayIndex + 1} — {activeDayPlan.theme}
                  </h2>

                  {activeDayPlan.activities.map((activity, aIdx) => (
                    <div
                      key={aIdx}
                      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {activity.time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {activity.location.name}
                          </p>
                          <p className="text-sm text-gray-800">{activity.name}</p>
                        </div>
                        <span className="flex-shrink-0 bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {activity.duration}
                        </span>
                      </div>

                      {activity.tips.length > 0 && (
                        <ul className="space-y-0.5 pl-1">
                          {activity.tips.slice(0, 2).map((tip, tIdx) => (
                            <li key={tIdx} className="text-xs text-gray-500 leading-snug">
                              · {tip}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Sourced tips — wisdom cited from the user's own clips */}
                      {activity.sourcedTips && activity.sourcedTips.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {activity.sourcedTips.map((st, sIdx) => (
                            <div
                              key={sIdx}
                              className="bg-emerald-50 rounded-lg px-2 py-1.5 border-l-2 border-emerald-300"
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
                    {plan.tips.map((tip, tIdx) => (
                      <li key={tIdx} className="text-xs text-amber-800 leading-snug">
                        · {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Start Over */}
              <button
                onClick={handleStartOver}
                className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                <RotateCcw size={15} />
                Start Over
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
