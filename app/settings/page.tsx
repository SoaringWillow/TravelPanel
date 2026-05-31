'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
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
import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';
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
type RestoreState = 'idle' | 'loading' | 'done' | 'error';

interface RestoreResult {
  addedItems: number;
  addedBoards: number;
  addedTrips: number;
  skipped: number;
  errors: number;
}

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

// ─── Restore helper ──────────────────────────────────────────────────────────

async function restoreFromFile(file: File): Promise<RestoreResult> {
  const text   = await file.text();
  const parsed = JSON.parse(text) as {
    _meta?: { version?: string };
    items?:  unknown[];
    boards?: unknown[];
    trips?:  unknown[];
  };

  if (!parsed.items && !parsed.boards && !parsed.trips) {
    throw new Error('Invalid backup file: missing items, boards, or trips');
  }

  // Load existing IDs for duplicate check
  const [existingItems, existingBoards, existingTrips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);
  const itemIds  = new Set(existingItems.map((i) => i.id));
  const boardIds = new Set(existingBoards.map((b) => b.id));
  const tripIds  = new Set(existingTrips.map((t) => t.id));

  let addedItems = 0, addedBoards = 0, addedTrips = 0, skipped = 0, errors = 0;

  for (const raw of parsed.items ?? []) {
    const item = raw as SavedItem;
    if (!item.id || !item.url) { errors++; continue; }
    if (itemIds.has(item.id)) { skipped++; continue; }
    try {
      await saveItem({ ...item, isDemo: false });
      addedItems++;
    } catch { errors++; }
  }

  for (const raw of parsed.boards ?? []) {
    const board = raw as Board;
    if (!board.id || !board.name) { errors++; continue; }
    if (boardIds.has(board.id)) { skipped++; continue; }
    try {
      await saveBoard({ ...board, isDemo: false });
      addedBoards++;
    } catch { errors++; }
  }

  for (const raw of parsed.trips ?? []) {
    const trip = raw as Trip;
    if (!trip.id || !trip.boardId) { errors++; continue; }
    if (tripIds.has(trip.id)) { skipped++; continue; }
    try {
      await saveTrip(trip);
      addedTrips++;
    } catch { errors++; }
  }

  return { addedItems, addedBoards, addedTrips, skipped, errors };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats,         setStats]         = useState<DataStats | null>(null);
  const [exportState,   setExportState]   = useState<ExportState>('idle');
  const [restoreState,  setRestoreState]  = useState<RestoreState>('idle');
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

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

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting same file
    setRestoreState('loading');
    setRestoreResult(null);
    try {
      const result = await restoreFromFile(file);
      setRestoreResult(result);
      setRestoreState('done');
      track('backup_restored', result);
    } catch {
      setRestoreState('error');
      setTimeout(() => setRestoreState('idle'), 4000);
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

        {/* Restore section */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📂</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Restore from backup</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Import a previous backup JSON file. Existing clips and boards are kept;
                  only new records are added.
                </p>
              </div>
            </div>

            <label
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all border-2 ${
                restoreState === 'loading'
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : restoreState === 'done'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : restoreState === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-dashed border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50'
              }`}
            >
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={restoreState === 'loading'}
                onChange={handleRestore}
              />
              {restoreState === 'loading' ? (
                <><span className="animate-spin">⏳</span> Restoring…</>
              ) : restoreState === 'error' ? (
                <><AlertCircle size={16} /> Invalid backup file</>
              ) : restoreState === 'done' && restoreResult ? (
                <><CheckCircle2 size={16} /> Restored!</>
              ) : (
                <>📂 Choose backup file</>
              )}
            </label>

            {restoreState === 'done' && restoreResult && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-emerald-50 rounded-xl p-3 space-y-0.5"
              >
                <p className="text-xs font-semibold text-emerald-800">Restore complete</p>
                <p className="text-xs text-emerald-700">
                  Added {restoreResult.addedItems} clips, {restoreResult.addedBoards} boards,{' '}
                  {restoreResult.addedTrips} plans
                </p>
                {restoreResult.skipped > 0 && (
                  <p className="text-xs text-emerald-600">
                    {restoreResult.skipped} duplicates skipped
                  </p>
                )}
                {restoreResult.errors > 0 && (
                  <p className="text-xs text-amber-600">
                    {restoreResult.errors} records couldn't be read
                  </p>
                )}
              </motion.div>
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
