'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';

interface BackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  stats: { items: number; boards: number; trips: number };
  data: { items: SavedItem[]; boards: Board[]; trips: Trip[] };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Status = { type: 'idle' } | { type: 'loading' } | { type: 'success'; msg: string } | { type: 'error'; msg: string };

export default function SettingsPage() {
  const [stats, setStats] = useState({ items: 0, boards: 0, trips: 0, sizeEst: 0 });
  const [exportStatus, setExportStatus] = useState<Status>({ type: 'idle' });
  const [importStatus, setImportStatus] = useState<Status>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadStats() {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const allTrips = (await Promise.all(boards.map((b) => getTripsForBoard(b.id)))).flat();
      const raw = JSON.stringify({ items, boards, trips: allTrips });
      setStats({
        items: items.filter((i) => !i.isDemo).length,
        boards: boards.filter((b) => !b.isDemo).length,
        trips: allTrips.length,
        sizeEst: new Blob([raw]).size,
      });
    }
    loadStats().catch(() => {});
  }, []);

  async function handleExport() {
    setExportStatus({ type: 'loading' });
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const trips = (await Promise.all(boards.map((b) => getTripsForBoard(b.id)))).flat();

      const payload: BackupPayload = {
        version: '1',
        exportedAt: new Date().toISOString(),
        app: 'TravelPanel',
        stats: { items: items.length, boards: boards.length, trips: trips.length },
        data: { items, boards, trips },
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `travelpanel-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportStatus({ type: 'success', msg: `Exported ${items.length} clips, ${boards.length} boards, ${trips.length} trips` });
      setTimeout(() => setExportStatus({ type: 'idle' }), 4000);
    } catch (err) {
      setExportStatus({ type: 'error', msg: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  }

  async function handleImport(file: File) {
    setImportStatus({ type: 'loading' });
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;

      if (payload.app !== 'TravelPanel' || payload.version !== '1') {
        throw new Error('Unrecognized backup format');
      }

      const { items = [], boards = [], trips = [] } = payload.data;

      await Promise.all([
        ...items.map((item) => saveItem(item)),
        ...boards.map((board) => saveBoard(board)),
        ...trips.map((trip) => saveTrip(trip)),
      ]);

      setImportStatus({
        type: 'success',
        msg: `Restored ${items.length} clips, ${boards.length} boards, ${trips.length} trips`,
      });
      setTimeout(() => setImportStatus({ type: 'idle' }), 5000);

      // Refresh stats
      setStats((prev) => ({
        ...prev,
        items: items.filter((i) => !i.isDemo).length,
        boards: boards.filter((b) => !b.isDemo).length,
        trips: trips.length,
      }));
    } catch (err) {
      setImportStatus({ type: 'error', msg: `Import failed: ${err instanceof Error ? err.message : 'Invalid file'}` });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 safe-top">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Data summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Your data</span>
            <span className="ml-auto text-xs text-gray-400">{formatBytes(stats.sizeEst)}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Clips', value: stats.items },
              { label: 'Collections', value: stats.boards },
              { label: 'Trip plans', value: stats.trips },
            ].map(({ label, value }) => (
              <div key={label} className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600">{value}</div>
                <div className="text-xs text-indigo-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Export section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Export backup</h2>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Download all your clips, boards, and trip plans as a JSON file. Use this to back up your data
            or transfer it to another device.
          </p>
          <button
            onClick={handleExport}
            disabled={exportStatus.type === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 px-4 text-sm font-semibold hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
          >
            <Download size={15} />
            {exportStatus.type === 'loading' ? 'Preparing…' : 'Download backup'}
          </button>
          <StatusMessage status={exportStatus} />
        </div>

        {/* Import section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Restore from backup</h2>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Import a previously exported backup. Existing data will be preserved — this merges
            rather than replaces.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus.type === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-2.5 px-4 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 active:scale-98 transition-all disabled:opacity-50"
          >
            <Upload size={15} />
            {importStatus.type === 'loading' ? 'Restoring…' : 'Import backup file'}
          </button>
          <StatusMessage status={importStatus} />
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>App</span>
              <span className="font-medium text-gray-700">TravelPanel</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="font-medium text-gray-700">Local (IndexedDB)</span>
            </div>
            <div className="flex justify-between">
              <span>AI</span>
              <span className="font-medium text-gray-700">Claude (Anthropic)</span>
            </div>
          </div>
        </div>
      </div>

      <NavBar active="settings" />
    </div>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (status.type === 'idle' || status.type === 'loading') return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-2.5 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
        status.type === 'success'
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {status.type === 'success' ? (
        <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
      )}
      {status.msg}
    </motion.div>
  );
}
