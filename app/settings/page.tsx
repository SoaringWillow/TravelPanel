'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Layers, Map, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import { generateBackup, downloadBackupJson, type BackupData } from '@/lib/exportBackup';

// ─── Stats ────────────────────────────────────────────────────────────────────

interface DataStats {
  items: number;
  boards: number;
  trips: number;
  locations: number;
  substanceItems: number;
}

async function loadStats(): Promise<DataStats> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripGroups = await Promise.all(boards.filter((b) => !b.isDemo).map((b) => getTripsForBoard(b.id)));
  const trips = tripGroups.flat();
  const realItems = items.filter((i) => !i.isDemo);
  return {
    items:          realItems.length,
    boards:         boards.filter((b) => !b.isDemo).length,
    trips:          trips.length,
    locations:      realItems.reduce((n, i) => n + i.locations.length, 0),
    substanceItems: realItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [stats, setStats]             = useState<DataStats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [lastExport, setLastExport]   = useState<BackupData | null>(null);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setStats(null));
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await generateBackup();
      downloadBackupJson(data);
      setLastExport(data);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  }

  const STAT_ROWS = stats
    ? [
        { label: 'Saved clips',      value: stats.items,          icon: Database },
        { label: 'Collections',      value: stats.boards,         icon: Layers   },
        { label: 'Trip plans',        value: stats.trips,          icon: Map      },
        { label: 'Locations pinned',  value: stats.locations,      icon: null     },
        { label: 'Wisdom items',      value: stats.substanceItems, icon: null     },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 page-content">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 page-header pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your data stays on this device</p>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

        {/* ── Data overview ───────────────────────────────────────── */}
        {stats && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Your Library
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {STAT_ROWS.map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i < STAT_ROWS.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Backup & Export ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Backup &amp; Export
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Download size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Download all my data</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Exports all your clips, boards, and trips as a JSON file.
                    Demo seed content is excluded. Keep this file safe — it&apos;s your backup.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exportState === 'loading'}
                className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  exportState === 'done'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : exportState === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                } disabled:opacity-60`}
              >
                {exportState === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {exportState === 'done'    && <CheckCircle2 size={16} />}
                {exportState === 'error'   && <AlertCircle size={16} />}
                {exportState === 'idle'    && <Download size={16} />}

                {exportState === 'loading' && 'Preparing backup…'}
                {exportState === 'done'    && 'Downloaded!'}
                {exportState === 'error'   && 'Export failed — try again'}
                {exportState === 'idle'    && 'Download backup (JSON)'}
              </button>

              {exportState === 'done' && lastExport && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  {lastExport.stats.items} clips · {lastExport.stats.boards} boards · {lastExport.stats.trips} plans
                </p>
              )}
            </div>

            <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="font-medium text-gray-500">File format:</span>{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">
                  travelpanel-backup-YYYY-MM-DD.json
                </code>
                — compatible with future TravelPanel import and cloud sync (coming soon).
              </p>
            </div>
          </div>
        </section>

        {/* ── About ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            About
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {[
              { label: 'App',       value: 'TravelPanel' },
              { label: 'Storage',   value: 'On-device (IndexedDB)' },
              { label: 'AI model',  value: 'Claude (Anthropic)' },
              { label: 'Maps',      value: 'MapLibre + OpenFreeMap' },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i < arr.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
