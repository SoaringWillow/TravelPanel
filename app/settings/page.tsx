'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Database,
  Map,
  Layers,
  Route,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { track } from '@/lib/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataStats {
  itemCount: number;
  boardCount: number;
  tripCount: number;
  locationCount: number;
  substanceCount: number;
  loadedAt: number;
}

type ExportState = 'idle' | 'loading' | 'done' | 'error';

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportAllData(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const payload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      counts: {
        items: items.length,
        boards: boards.length,
        trips: trips.length,
      },
    },
    items,
    boards,
    trips,
  };

  const json     = JSON.stringify(payload, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const dateStr  = new Date().toISOString().slice(0, 10);
  const filename = `travelpanel-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href       = url;
  a.download   = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats,       setStats]       = useState<DataStats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  useEffect(() => {
    async function loadStats() {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      setStats({
        itemCount:      items.length,
        boardCount:     boards.length,
        tripCount:      trips.length,
        locationCount:  items.reduce((n, i) => n + (i.locations?.length ?? 0), 0),
        substanceCount: items.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
        loadedAt:       Date.now(),
      });
    }
    loadStats().catch(console.error);
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      await exportAllData();
      track('backup_exported', {
        itemCount:  stats?.itemCount ?? 0,
        boardCount: stats?.boardCount ?? 0,
        tripCount:  stats?.tripCount ?? 0,
      });
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Data summary card */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Your Data
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <StatRow
              icon={<Map size={16} className="text-indigo-500" />}
              label="Saved clips"
              value={stats?.itemCount}
              loading={!stats}
            />
            <StatRow
              icon={<Layers size={16} className="text-violet-500" />}
              label="Boards"
              value={stats?.boardCount}
              loading={!stats}
            />
            <StatRow
              icon={<Route size={16} className="text-emerald-500" />}
              label="Trip plans"
              value={stats?.tripCount}
              loading={!stats}
            />
            <StatRow
              icon={<span className="text-amber-500 text-sm">📍</span>}
              label="Locations extracted"
              value={stats?.locationCount}
              loading={!stats}
            />
            <StatRow
              icon={<span className="text-blue-500 text-sm">💡</span>}
              label="Wisdom items"
              value={stats?.substanceCount}
              loading={!stats}
              last
            />
          </div>
        </section>

        {/* Export section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Backup
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Database size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Full data backup</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Downloads all your clips, boards, and trip plans as a JSON file.
                  Use this to back up your data or move it to another device.
                </p>
              </div>
            </div>

            <motion.button
              onClick={handleExport}
              disabled={exportState === 'loading' || exportState === 'done'}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                exportState === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : exportState === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {exportState === 'loading' ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  Preparing backup…
                </>
              ) : exportState === 'done' ? (
                <>
                  <CheckCircle2 size={16} />
                  Downloaded!
                </>
              ) : exportState === 'error' ? (
                <>
                  <AlertCircle size={16} />
                  Export failed — try again
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download backup
                  {stats && (
                    <span className="opacity-70 font-normal">
                      · {stats.itemCount} clips
                    </span>
                  )}
                </>
              )}
            </motion.button>

            {exportState === 'done' && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-600 text-center mt-2"
              >
                Saved as travelpanel-backup-{new Date().toISOString().slice(0, 10)}.json
              </motion.p>
            )}
          </div>
        </section>

        {/* About section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <AboutRow label="Version" value="1.0 (Phase A)" />
            <AboutRow label="Storage" value="Local device (IndexedDB)" />
            <AboutRow label="Sync" value="Coming soon (Phase B)" last />
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  loading,
  last,
}: {
  icon: ReactNode;
  label: string;
  value?: number;
  loading?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        last ? '' : 'border-b border-gray-50'
      }`}
    >
      <span className="w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      {loading ? (
        <span className="w-8 h-4 bg-gray-100 rounded animate-pulse" />
      ) : (
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {value?.toLocaleString() ?? '0'}
        </span>
      )}
    </div>
  );
}

function AboutRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        last ? '' : 'border-b border-gray-50'
      }`}
    >
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
