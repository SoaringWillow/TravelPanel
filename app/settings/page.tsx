'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Info, CheckCircle2, Loader2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, downloadAsJSON } from '@/lib/exportData';

interface Stats {
  clips: number;
  boards: number;
  trips: number;
  substanceItems: number;
  locations: number;
}

type ExportState = 'idle' | 'exporting' | 'done';

export default function SettingsPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  useEffect(() => {
    async function loadStats() {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      setStats({
        clips:          items.length,
        boards:         boards.length,
        trips:          trips.length,
        substanceItems: items.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
        locations:      items.reduce((n, i) => n + (i.locations?.length ?? 0), 0),
      });
    }
    loadStats();
  }, []);

  async function handleExport() {
    setExportState('exporting');
    try {
      const data = await exportAllData();
      downloadAsJSON(data);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 pt-6 space-y-5">

        {/* ── Stats card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Database size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Your data</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Clips',       value: stats?.clips          },
              { label: 'Boards',      value: stats?.boards         },
              { label: 'Trips',       value: stats?.trips          },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-4">
                <span className="text-2xl font-bold text-indigo-600">
                  {value ?? '—'}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
          {stats && (stats.locations > 0 || stats.substanceItems > 0) && (
            <div className="px-4 pb-4 pt-1 flex gap-4">
              <span className="text-xs text-gray-400">
                📍 <strong className="text-gray-600">{stats.locations}</strong> locations mapped
              </span>
              <span className="text-xs text-gray-400">
                💡 <strong className="text-gray-600">{stats.substanceItems}</strong> wisdom items
              </span>
            </div>
          )}
        </div>

        {/* ── Backup & Export ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Download size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Backup &amp; Export</span>
          </div>

          <div className="px-4 py-4 space-y-3">
            <div>
              <p className="text-sm text-gray-700 font-medium">Download all my data</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Exports all clips, boards, trips, and substance items as a JSON file.
                Re-import via Supabase (coming soon) to sync across devices.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportState !== 'idle'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                exportState === 'done'
                  ? 'bg-green-500 text-white'
                  : exportState === 'exporting'
                    ? 'bg-indigo-400 text-white cursor-wait'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              {exportState === 'exporting' ? (
                <><Loader2 size={15} className="animate-spin" /> Preparing export…</>
              ) : exportState === 'done' ? (
                <><CheckCircle2 size={15} /> Downloaded!</>
              ) : (
                <><Download size={15} /> Export as JSON</>
              )}
            </button>

            {stats && stats.clips === 0 && (
              <p className="text-xs text-gray-400 text-center">No clips to export yet.</p>
            )}
          </div>
        </div>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Info size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">About</span>
          </div>
          <div className="px-4 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">App</span>
              <span className="text-sm font-medium text-gray-900">TravelPanel</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm text-gray-900">Local (IndexedDB)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI extraction</span>
              <span className="text-sm text-gray-900">Claude (Anthropic)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cloud sync</span>
              <span className="text-sm text-indigo-500">Coming soon</span>
            </div>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
