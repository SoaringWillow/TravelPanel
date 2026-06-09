'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAndDownload, TravelPanelBackup } from '@/lib/exportData';
import { getAllItems, getAllBoards, saveItem, saveBoard, saveTrip, deleteBoard } from '@/lib/db';
import { track } from '@/lib/analytics';

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [itemCount,  setItemCount]  = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);

  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [exportCounts, setExportCounts] = useState<{ items: number; boards: number; trips: number } | null>(null);

  const [importState, setImportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearState, setClearState] = useState<'idle' | 'loading' | 'done'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    });
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────

  async function handleExport() {
    setExportState('loading');
    try {
      const counts = await exportAndDownload();
      setExportCounts(counts);
      setExportState('done');
      track('data_exported', counts);
    } catch {
      setExportState('error');
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────

  async function handleImportFile(file: File) {
    setImportState('loading');
    setImportMessage('');
    try {
      const text   = await file.text();
      const backup = JSON.parse(text) as TravelPanelBackup;

      if (backup.version !== '1.0') {
        setImportMessage('Unrecognised backup version.');
        setImportState('error');
        return;
      }

      let imported = 0;

      for (const item of backup.items ?? []) {
        await saveItem({ ...item, isDemo: false });
        imported++;
      }
      for (const board of backup.boards ?? []) {
        await saveBoard({ ...board, isDemo: false });
      }
      for (const trip of backup.trips ?? []) {
        await saveTrip(trip);
      }

      setImportMessage(`Restored ${imported} clip${imported !== 1 ? 's' : ''}.`);
      setImportState('done');
      track('data_imported', { items: imported });

      // Refresh counts
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    } catch {
      setImportMessage('Could not read the file. Is it a TravelPanel backup?');
      setImportState('error');
    }
  }

  // ── Clear all data ───────────────────────────────────────────────────────

  async function handleClearAll() {
    setClearState('loading');
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const { deleteItem } = await import('@/lib/db');
      for (const item of items.filter((i) => !i.isDemo)) {
        await deleteItem(item.id);
      }
      for (const board of boards.filter((b) => !b.isDemo)) {
        await deleteBoard(board.id);
      }
      setItemCount(0);
      setBoardCount(0);
      setClearState('done');
      setClearConfirm(false);
      track('data_cleared');
    } catch {
      setClearState('idle');
      setClearConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-md mx-auto">

        {/* Stats */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Clips saved" value={itemCount ?? '…'} />
            <StatCard label="Collections" value={boardCount ?? '…'} />
          </div>
        </section>

        {/* Export */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Backup</h2>
          <p className="text-sm text-gray-500 mb-3">
            Download all your clips, collections, and trip plans as a JSON file you can restore later.
          </p>

          <button
            type="button"
            onClick={handleExport}
            disabled={exportState === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3 px-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {exportState === 'loading' ? (
              <span className="animate-pulse">Preparing download…</span>
            ) : (
              <>
                <Download size={16} />
                Download all my data
              </>
            )}
          </button>

          {exportState === 'done' && exportCounts && (
            <div className="mt-3 flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                Exported {exportCounts.items} clip{exportCounts.items !== 1 ? 's' : ''},{' '}
                {exportCounts.boards} collection{exportCounts.boards !== 1 ? 's' : ''},{' '}
                {exportCounts.trips} trip plan{exportCounts.trips !== 1 ? 's' : ''}.
              </span>
            </div>
          )}

          {exportState === 'error' && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="flex-shrink-0" />
              Export failed. Try again.
            </div>
          )}
        </section>

        {/* Import / Restore */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Restore</h2>
          <p className="text-sm text-gray-500 mb-3">
            Restore from a TravelPanel backup file. Existing data is kept — this only adds clips that are missing.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importState === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold text-sm py-3 px-4 rounded-2xl hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {importState === 'loading' ? (
              <span className="animate-pulse">Importing…</span>
            ) : (
              <>
                <Upload size={16} />
                Restore from backup
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e: { target: HTMLInputElement }) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />

          {importState === 'done' && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              {importMessage}
            </div>
          )}

          {importState === 'error' && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="flex-shrink-0" />
              {importMessage}
            </div>
          )}
        </section>

        {/* Clear all data */}
        <section className="pb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-3">
            Permanently delete all your clips and collections from this device.
          </p>

          {!clearConfirm ? (
            <button
              type="button"
              onClick={() => setClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 font-semibold text-sm py-3 px-4 rounded-2xl hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              <Trash2 size={16} />
              Clear all data
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-red-700 text-center">
                This cannot be undone. Export a backup first.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearState === 'loading'}
                  className="flex-1 bg-red-600 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {clearState === 'loading' ? 'Deleting…' : 'Yes, delete all'}
                </button>
              </div>
            </div>
          )}

          {clearState === 'done' && (
            <p className="mt-2 text-sm text-center text-gray-400">All data cleared.</p>
          )}
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
