'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllItems, getAllBoards, getAllTrips, deleteItem, deleteBoard, deleteTrip } from '@/lib/db';
import { track } from '@/lib/analytics';
import NavBar from '@/components/NavBar';

// ─── Export helpers ─────────────────────────────────────────────────────────

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

async function buildExportPayload() {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

function downloadJson(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats] = useState({ items: 0, boards: 0, trips: 0 });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm' | 'deleting' | 'done'>('idle');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const payload = await buildExportPayload();
      downloadJson(payload, `travelpanel-backup-${dateStamp()}.json`);
      track('data_exported', { items: payload.stats.items });
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAll() {
    setDeletePhase('deleting');
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
      setStats({ items: 0, boards: 0, trips: 0 });
      track('data_deleted_all');
      setDeletePhase('done');
    } catch {
      setDeletePhase('idle');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {/* Data stats card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Your data
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Clips', value: stats.items, emoji: '📎' },
              { label: 'Boards', value: stats.boards, emoji: '🗂' },
              { label: 'Plans', value: stats.trips, emoji: '🗺' },
            ] as const).map(({ label, value, emoji }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xl font-bold text-gray-800">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Export card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Export backup
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Download all your clips, boards, and trip plans as a JSON file. Import is coming in a future update.
          </p>

          <AnimatePresence mode="wait">
            {exported ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                <CheckCircle2 size={16} />
                Backup downloaded!
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={handleExport}
                disabled={exporting || stats.items === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {exporting ? 'Preparing…' : `Download all data (${stats.items} clips)`}
              </motion.button>
            )}
          </AnimatePresence>

          {stats.items === 0 && !exporting && (
            <p className="text-xs text-gray-400 mt-2 text-center">No clips to export yet.</p>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-1">
            Danger zone
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Permanently deletes all clips, boards, and plans from this device. This cannot be undone.
          </p>

          {deletePhase === 'idle' && (
            <button
              type="button"
              onClick={() => setDeletePhase('confirm')}
              disabled={stats.items === 0 && stats.boards === 0}
              className="flex items-center gap-2 border-2 border-red-200 text-red-500 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} />
              Delete all data
            </button>
          )}

          {deletePhase === 'confirm' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  This will permanently delete {stats.items} clip{stats.items !== 1 ? 's' : ''}, {stats.boards} board{stats.boards !== 1 ? 's' : ''}, and {stats.trips} trip plan{stats.trips !== 1 ? 's' : ''}. Export a backup first.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletePhase('idle')}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Yes, delete all
                </button>
              </div>
            </div>
          )}

          {deletePhase === 'deleting' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Deleting…
            </div>
          )}

          {deletePhase === 'done' && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle2 size={15} />
              All data deleted.
            </div>
          )}
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            About
          </h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>TravelPanel</span>
              <span className="text-gray-400">v0.1</span>
            </div>
            <div className="flex justify-between">
              <span>Powered by</span>
              <span className="text-gray-400">Claude + MapLibre</span>
            </div>
            <p className="text-xs text-gray-400 pt-2">
              All data is stored locally on your device. Cloud sync coming in a future update.
            </p>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
