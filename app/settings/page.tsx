'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, ChevronRight, Database, Map, BookOpen, Route, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData } from '@/lib/exportData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

type ExportState = 'idle' | 'loading' | 'success' | 'error';
type ClearState  = 'idle' | 'confirming' | 'clearing' | 'done';

// ─── Settings page ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportCounts, setExportCounts] = useState<Stats | null>(null);
  const [clearState, setClearState]   = useState<ClearState>('idle');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(
      ([items, boards, trips]) =>
        setStats({ items: items.length, boards: boards.length, trips: trips.length }),
    );
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const counts = await exportAllData();
      setExportCounts(counts);
      setExportState('success');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleClearAll() {
    if (clearState === 'idle') {
      setClearState('confirming');
      return;
    }
    if (clearState !== 'confirming') return;

    setClearState('clearing');
    try {
      const { deleteDatabase } = await import('@/lib/db');
      await deleteDatabase();
      setClearState('done');
      // Reload to reflect empty state
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch {
      setClearState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 pt-safe">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-5 space-y-4 pb-nav">

        {/* Storage stats */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Your Data
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            <StatRow icon={<BookOpen size={16} className="text-indigo-500" />} label="Clips saved" value={stats?.items} />
            <StatRow icon={<Map       size={16} className="text-teal-500"   />} label="Collections" value={stats?.boards} />
            <StatRow icon={<Route     size={16} className="text-orange-400" />} label="Trip plans"  value={stats?.trips} />
          </div>
        </section>

        {/* Export */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Backup
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                {exportState === 'success'
                  ? <CheckCircle2 size={18} className="text-green-500" />
                  : <Download size={18} className="text-indigo-600" />
                }
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">Export all data</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {exportState === 'loading' && 'Preparing download…'}
                  {exportState === 'success' && exportCounts
                    ? `Downloaded ${exportCounts.items} clips, ${exportCounts.boards} boards, ${exportCounts.trips} plans`
                    : exportState === 'error'
                      ? 'Export failed — try again'
                      : 'Download a JSON backup of your clips, boards, and plans'
                  }
                </p>
              </div>
              {exportState === 'loading'
                ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin flex-shrink-0" />
                : <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 px-1 mt-2">
            The JSON file contains all your clips (with substance data), boards, and trip plans.
            You can re-import it when cloud sync is available (Phase B).
          </p>
        </section>

        {/* Danger zone */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Danger Zone
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {clearState === 'idle' && (
                <motion.button
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleClearAll}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-red-600">Clear all data</p>
                    <p className="text-xs text-gray-400 mt-0.5">Permanently delete all clips, boards, and plans</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </motion.button>
              )}

              {clearState === 'confirming' && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Are you sure?</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        This will permanently delete all {stats?.items ?? 0} clips,{' '}
                        {stats?.boards ?? 0} boards, and {stats?.trips ?? 0} plans.
                        This cannot be undone. Consider exporting first.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setClearState('idle')}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete everything
                    </button>
                  </div>
                </motion.div>
              )}

              {(clearState === 'clearing' || clearState === 'done') && (
                <motion.div
                  key="clearing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-4 flex items-center gap-3"
                >
                  {clearState === 'clearing'
                    ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    : <CheckCircle2 size={18} className="text-green-500" />
                  }
                  <p className="text-sm text-gray-600">
                    {clearState === 'clearing' ? 'Clearing data…' : 'Done — redirecting…'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* App info */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Storage" value="IndexedDB (local)" />
            <InfoRow label="AI extraction" value="Claude claude-sonnet-4-6" />
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | undefined }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-sm font-semibold text-gray-900">
        {value == null ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-400">{value}</span>
    </div>
  );
}
