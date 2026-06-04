'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Database, Map, BookOpen, Route, AlertCircle, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, importFromBackup, getDataStats } from '@/lib/exportData';

type ExportState = 'idle' | 'exporting' | 'done' | 'error';
type ImportState = 'idle' | 'importing' | 'done' | 'error';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

export default function SettingsPage() {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importMsg, setImportMsg]     = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDataStats().then(setStats).catch(() => setStats({ items: 0, boards: 0, trips: 0 }));
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExportState('exporting');
    try {
      await exportAllData();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportState('importing');
    setImportMsg('');
    try {
      const result = await importFromBackup(file);
      setImportMsg(
        `Restored ${result.items} clips, ${result.boards} boards, ${result.trips} trips` +
        (result.skipped ? ` (${result.skipped} skipped)` : '') +
        (result.errors.length ? `. ${result.errors.length} errors.` : '.')
      );
      setImportState('done');
      // Refresh stats
      getDataStats().then(setStats).catch(() => {});
      setTimeout(() => setImportState('idle'), 6000);
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed');
      setImportState('error');
      setTimeout(() => setImportState('idle'), 5000);
    }
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  const statCards = [
    { icon: Map,      label: 'Clips',       value: stats?.items  ?? '—' },
    { icon: BookOpen, label: 'Collections', value: stats?.boards ?? '—' },
    { icon: Route,    label: 'Trip plans',  value: stats?.trips  ?? '—' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-5 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Data overview ─────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <Database size={16} className="text-indigo-500" strokeWidth={2} />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your data</h2>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            {statCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-5 gap-1.5">
                <Icon size={18} className="text-indigo-400" strokeWidth={1.8} />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Stored locally on this device. Export a backup to keep your data safe — or to move it between devices.
            </p>
          </div>
        </section>

        {/* ── Backup & Restore ──────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Backup &amp; Restore</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Export your clips, boards, and trip plans as a JSON file.</p>
          </div>

          <div className="p-5 flex flex-col gap-3">

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {exportState === 'exporting' ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/>
                  </svg>
                  Preparing download…
                </>
              ) : exportState === 'done' ? (
                <><CheckCircle2 size={18} /> Downloaded!</>
              ) : exportState === 'error' ? (
                <><AlertCircle size={18} /> Export failed — try again</>
              ) : (
                <><Download size={18} /> Download my data (JSON)</>
              )}
            </button>

            {/* Import button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'importing'}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {importState === 'importing' ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/>
                  </svg>
                  Restoring…
                </>
              ) : (
                <><Upload size={18} /> Restore from backup</>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Import result feedback */}
            <AnimatePresence>
              {importMsg && (
                <motion.div
                  key="import-msg"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
                    importState === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {importState === 'error'
                    ? <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  }
                  <span>{importMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">About</h2>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">App</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">TravelPanel</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Mission</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Substance over Spots</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Storage</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Local (IndexedDB)</span>
            </div>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
