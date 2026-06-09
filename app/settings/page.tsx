'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import { exportAndDownload } from '@/lib/exportData';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

export default function SettingsPage() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
        const realItems  = items.filter((i) => !i.isDemo);
        const realBoards = boards.filter((b) => !b.isDemo);
        let tripCount = 0;
        for (const board of realBoards) {
          const bt = await getTripsForBoard(board.id);
          tripCount += bt.length;
        }
        setStats({ items: realItems.length, boards: realBoards.length, trips: tripCount });
      } catch {
        setStats({ items: 0, boards: 0, trips: 0 });
      }
    };
    load();
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setExported(false);
    try {
      await exportAndDownload(false);
      setExported(true);
      setTimeout(() => setExported(false), 4000);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Data & Backup ─────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Data &amp; Backup
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">

            {/* Stats row */}
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Database size={15} className="text-indigo-400" />
                Your data
              </p>
              {stats ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Clips',    value: stats.items  },
                    { label: 'Boards',   value: stats.boards },
                    { label: 'Itineraries', value: stats.trips  },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <span className="text-sm text-gray-400 animate-pulse">Loading…</span>
                </div>
              )}
            </div>

            {/* Export button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !stats}
              className="w-full px-4 py-3.5 flex items-center justify-between group hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                {exported ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : (
                  <Download
                    size={18}
                    className={`text-indigo-500 ${exporting ? 'animate-bounce' : 'group-hover:translate-y-0.5 transition-transform'}`}
                  />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">
                    {exported ? 'Downloaded!' : exporting ? 'Preparing…' : 'Export all data'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Downloads a JSON file you can re-import or keep as a backup
                  </p>
                </div>
              </div>
              {!exporting && !exported && (
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
              )}
            </button>

            {error && (
              <p className="px-4 py-2 text-sm text-red-600 bg-red-50">{error}</p>
            )}

            {/* What's included */}
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-400 leading-relaxed">
                Includes all clips, boards, and saved itineraries. Demo/seed content is excluded.
                The file format is TravelPanel JSON v1.0 — useful for migration and peace of mind.
              </p>
            </div>
          </div>
        </section>

        {/* ── App info ───────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
            <div className="px-4 py-3.5 flex items-center gap-3">
              <Info size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-800">TravelPanel</p>
                <p className="text-xs text-gray-400 mt-0.5">Travel inspiration clipper + AI trip planner</p>
              </div>
            </div>
            <div className="px-4 py-3 text-xs text-gray-400 leading-relaxed">
              Clips social travel posts, extracts locations and wisdom with Claude AI,
              and generates sourced multi-day itineraries from your saved inspiration.
            </div>
          </div>
        </section>

        {/* ── Coming soon ───────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Coming soon
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
            {[
              { label: 'Cloud sync',    sub: 'Sync across devices via Supabase' },
              { label: 'Import backup', sub: 'Restore from a JSON backup file'  },
              { label: 'Vibe search',   sub: 'Find clips by mood or theme'       },
            ].map(({ label, sub }) => (
              <div key={label} className="px-4 py-3.5 flex items-center justify-between opacity-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
