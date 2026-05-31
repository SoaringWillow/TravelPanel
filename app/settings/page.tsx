'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, Trash2, Database } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportAllData(): Promise<{ items: number; boards: number; trips: number }> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Strip demo seed items from exports
  const realItems  = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !realItems.every((i) => !b.itemIds.includes(i.id)) || b.itemIds.length === 0
    ? true : realItems.some((i) => b.itemIds.includes(i.id)));

  const payload = {
    version: 1,
    exportDate: new Date().toISOString(),
    app: 'TravelPanel',
    counts: { items: realItems.length, boards: realBoards.length, trips: trips.length },
    items: realItems,
    boards: realBoards,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { items: realItems.length, boards: realBoards.length, trips: trips.length };
}

// ─── Component ────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export default function SettingsPage() {
  const [counts, setCounts]       = useState({ items: 0, boards: 0, trips: 0 });
  const [exportState, setExport]  = useState<ExportState>('idle');
  const [exported, setExported]   = useState({ items: 0, boards: 0, trips: 0 });

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()])
      .then(([items, boards, trips]) =>
        setCounts({
          items:  items.filter((i) => !i.isDemo).length,
          boards: boards.length,
          trips:  trips.length,
        })
      )
      .catch(() => {});
  }, []);

  async function handleExport() {
    setExport('exporting');
    try {
      const result = await exportAllData();
      setExported(result);
      setExport('done');
      setTimeout(() => setExport('idle'), 4000);
    } catch {
      setExport('error');
      setTimeout(() => setExport('idle'), 4000);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Data summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Your data
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Clips',       value: counts.items  },
              { label: 'Collections', value: counts.boards },
              { label: 'Trip plans',  value: counts.trips  },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-4 px-2">
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                <span className="text-xs text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Export section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Backup &amp; export
            </p>
          </div>

          <div className="px-4 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Database size={17} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Download all my data</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Exports all clips, collections, and trip plans as a JSON file.
                  Your data is stored locally — this backup protects against device wipes.
                </p>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold
                         hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportState === 'exporting' ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Preparing backup…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download backup (JSON)
                </>
              )}
            </button>

            {exportState === 'done' && (
              <div className="flex items-start gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 leading-relaxed">
                  Backup downloaded — {exported.items} clip{exported.items !== 1 ? 's' : ''},{' '}
                  {exported.boards} collection{exported.boards !== 1 ? 's' : ''},{' '}
                  {exported.trips} trip plan{exported.trips !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {exportState === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">
                  Export failed. Please try again.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Danger zone
            </p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 size={17} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Clear all data</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Permanently deletes all clips, collections, and plans from this device.
                  Download a backup first.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Delete ALL your TravelPanel data? This cannot be undone.')) {
                      indexedDB.deleteDatabase('travel-panel');
                      window.location.reload();
                    }
                  }}
                  className="mt-3 text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                >
                  Clear all data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-300">TravelPanel v1.0 · Data stored locally on this device</p>
        </div>

      </div>

      <NavBar active="settings" />
    </main>
  );
}
