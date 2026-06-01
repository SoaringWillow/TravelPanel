'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Database, Info, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportBackup, importBackup } from '@/lib/backup';

type ImportStatus = { state: 'idle' } | { state: 'loading' } | { state: 'success'; imported: number } | { state: 'error'; message: string };
type ExportStatus = 'idle' | 'loading' | 'done';

export default function SettingsPage() {
  const [itemCount,  setItemCount]  = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [tripCount,  setTripCount]  = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [importStatus, setImportStatus] = useState<ImportStatus>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setItemCount(items.length);
      setBoardCount(boards.length);
      setTripCount(trips.length);
    });
  }, []);

  async function handleExport() {
    setExportStatus('loading');
    try {
      await exportBackup();
      setExportStatus('done');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch {
      setExportStatus('idle');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportStatus({ state: 'loading' });
    try {
      const { imported } = await importBackup(file);
      setImportStatus({ state: 'success', imported });
      // Refresh counts
      const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);
      setItemCount(items.length);
      setBoardCount(boards.length);
      setTripCount(trips.length);
      setTimeout(() => setImportStatus({ state: 'idle' }), 5000);
    } catch (err) {
      setImportStatus({ state: 'error', message: err instanceof Error ? err.message : 'Import failed' });
      setTimeout(() => setImportStatus({ state: 'idle' }), 5000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 safe-top">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Data summary card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">Your Data</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Clips',      count: itemCount  },
              { label: 'Collections', count: boardCount },
              { label: 'Plans',      count: tripCount  },
            ].map(({ label, count }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {count === null ? '–' : count}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exportStatus !== 'idle'}
            className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-indigo-700">
              {exportStatus === 'done'
                ? <CheckCircle2 size={17} className="text-green-500" />
                : <Download size={17} />}
              {exportStatus === 'loading' ? 'Preparing…' : exportStatus === 'done' ? 'Download started!' : 'Download backup'}
            </span>
            {exportStatus === 'idle' && <ChevronRight size={15} className="text-indigo-400" />}
          </button>

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus.state === 'loading'}
            className="w-full flex items-center justify-between px-4 py-3 mt-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-600">
              <Upload size={17} />
              {importStatus.state === 'loading' ? 'Importing…' : 'Restore from backup'}
            </span>
            {importStatus.state === 'idle' && <ChevronRight size={15} className="text-gray-400" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />

          {/* Import status feedback */}
          <AnimatePresence>
            {importStatus.state === 'success' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-700 font-medium">
                    Restored {importStatus.imported} records successfully.
                  </p>
                </div>
              </motion.div>
            )}
            {importStatus.state === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{importStatus.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Backup includes all your clips, collections, and trip plans as a JSON file. Restore merges data without deleting existing records.
          </p>
        </div>

        {/* About card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">About</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>TravelPanel</span>
              <span className="font-medium text-gray-700">v0.1.0</span>
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
