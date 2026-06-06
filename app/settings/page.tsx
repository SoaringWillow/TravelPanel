'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Trash2, CheckCircle2, AlertTriangle,
  Map, Package, Route, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips, deleteItem, deleteBoard, deleteTrip } from '@/lib/db';
import { exportAllData } from '@/lib/exportData';
import { track } from '@/lib/analytics';

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]           = useState({ items: 0, boards: 0, trips: 0 });
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [clearing, setClearing]     = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    async function loadStats() {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      setStats({
        items:  items.filter((i) => !i.isDemo).length,
        boards: boards.filter((b) => !b.isDemo).length,
        trips:  trips.length,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const backup = await exportAllData();
      track('data_exported', { items: backup.stats.items, boards: backup.stats.boards });
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch {
      // Export failed silently — user can retry
    } finally {
      setExporting(false);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      await Promise.all([
        ...items.map((i) => deleteItem(i.id)),
        ...boards.map((b) => deleteBoard(b.id)),
        ...trips.map((t) => deleteTrip(t.id)),
      ]);
      track('data_cleared');
      setStats({ items: 0, boards: 0, trips: 0 });
      setConfirmClear(false);
    } catch {
      // Clear failed — leave state as-is
    } finally {
      setClearing(false);
    }
  }

  const hasData = stats.items > 0 || stats.boards > 0 || stats.trips > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-safe-top">
        <div className="flex items-center gap-3 py-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight size={20} className="rotate-180" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">

        {/* Data stats */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Your data
          </h2>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={Map}     label="Clips"       value={stats.items}  color="bg-indigo-500" />
              <StatCard icon={Package} label="Collections" value={stats.boards} color="bg-violet-500" />
              <StatCard icon={Route}   label="Trip plans"  value={stats.trips}  color="bg-blue-500"   />
            </div>
          )}
        </section>

        {/* Backup */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Backup
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Download all my data</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Exports all your clips, collections, and trip plans as a JSON file.
                Demo content is excluded. Keep this as a backup.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || !hasData}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              <AnimatePresence mode="wait" initial={false}>
                {exportDone ? (
                  <motion.span
                    key="done"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Downloaded!
                  </motion.span>
                ) : exporting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2"
                  >
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2"
                  >
                    <Download size={16} />
                    {hasData ? `Download backup (${stats.items} clips)` : 'No data yet'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {!hasData && (
              <p className="text-xs text-gray-400 text-center">
                Save some clips first and they'll appear here.
              </p>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Danger zone
          </h2>
          <div className="bg-white rounded-xl border border-red-100 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Clear all data</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Permanently deletes all clips, collections, and trip plans from this device.
                This cannot be undone — download a backup first.
              </p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {confirmClear ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      This will permanently delete{' '}
                      <strong>{stats.items} clip{stats.items !== 1 ? 's' : ''}</strong>,{' '}
                      <strong>{stats.boards} collection{stats.boards !== 1 ? 's' : ''}</strong>, and{' '}
                      <strong>{stats.trips} trip plan{stats.trips !== 1 ? 's' : ''}</strong>.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-2 rounded-lg border-2 border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={clearing}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {clearing ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Delete everything
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="trigger"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmClear(true)}
                  disabled={!hasData}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-red-200 text-red-600 text-sm font-medium disabled:opacity-40 transition-colors hover:bg-red-50 active:scale-[0.98]"
                >
                  <Trash2 size={15} />
                  Clear all data
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* App info */}
        <section className="text-center pt-2">
          <p className="text-xs text-gray-400">TravelPanel · v1.0 · Data stored locally on device</p>
          <p className="text-xs text-gray-400 mt-0.5">Cloud sync available when Supabase is connected</p>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
