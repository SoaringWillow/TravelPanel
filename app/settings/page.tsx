'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, ChevronLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { exportAllData, importBackupFile, ImportSummary } from '@/lib/exportData';
import { getAllItems } from '@/lib/db';
import NavBar from '@/components/NavBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'done' | 'error';
type ImportState = 'idle' | 'loading' | 'done' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError]     = useState('');
  const [itemCount, setItemCount]         = useState<number | null>(null);
  const [clearConfirm, setClearConfirm]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load item count on mount
  useState(() => {
    getAllItems().then((items) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
    });
  });

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExportState('loading');
    try {
      await exportAllData();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImportFile(file: File) {
    setImportState('loading');
    setImportError('');
    setImportSummary(null);
    try {
      const summary = await importBackupFile(file);
      setImportSummary(summary);
      setImportState('done');
      // Refresh item count
      const items = await getAllItems();
      setItemCount(items.filter((i) => !i.isDemo).length);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import backup');
      setImportState('error');
    }
  }

  // ── Clear all data ──────────────────────────────────────────────────────────

  async function handleClearAll() {
    try {
      indexedDB.deleteDatabase('travel-panel');
      localStorage.clear();
      window.location.href = '/';
    } catch {
      // Reload regardless — IDB will be recreated fresh
      window.location.href = '/';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-4">

        {/* Stats */}
        {itemCount !== null && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900 text-xl">{itemCount}</span>{' '}
              clip{itemCount !== 1 ? 's' : ''} saved
            </p>
          </div>
        )}

        {/* Export section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Backup &amp; Export</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Download all your clips, boards, and trip plans as a JSON file.
            </p>
          </div>
          <div className="px-4 py-4">
            <button
              type="button"
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {exportState === 'loading' ? (
                <><Loader2 size={16} className="animate-spin" /> Preparing download…</>
              ) : exportState === 'done' ? (
                <><CheckCircle2 size={16} /> Downloaded!</>
              ) : exportState === 'error' ? (
                <><AlertCircle size={16} /> Export failed</>
              ) : (
                <><Download size={16} /> Download backup (JSON)</>
              )}
            </button>
          </div>
        </div>

        {/* Import section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Restore from Backup</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Import a previously exported JSON backup. Existing clips are kept — duplicates are overwritten by the backup.
            </p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-medium text-sm hover:border-indigo-400 hover:text-indigo-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {importState === 'loading' ? (
                <><Loader2 size={16} className="animate-spin" /> Importing…</>
              ) : (
                <><Upload size={16} /> Choose backup file (.json)</>
              )}
            </button>

            {importState === 'done' && importSummary && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-sm">
                <p className="font-semibold text-green-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={14} /> Restored successfully
                </p>
                <p className="text-green-700">
                  {importSummary.itemsRestored} clip{importSummary.itemsRestored !== 1 ? 's' : ''},{' '}
                  {importSummary.boardsRestored} board{importSummary.boardsRestored !== 1 ? 's' : ''},{' '}
                  {importSummary.tripsRestored} trip plan{importSummary.tripsRestored !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {importState === 'error' && importError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm">
                <p className="font-semibold text-red-800 flex items-center gap-1.5 mb-0.5">
                  <AlertCircle size={14} /> Import failed
                </p>
                <p className="text-red-700">{importError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Clear all data */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-4 py-4 border-b border-red-50">
            <h2 className="font-semibold text-red-700">Danger zone</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Permanently delete all clips, boards, and trip plans from this device.
            </p>
          </div>
          <div className="px-4 py-4">
            {!clearConfirm ? (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} /> Clear all data
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 text-center">
                  This cannot be undone. Export a backup first.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    Delete all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* App info */}
        <div className="text-center text-xs text-gray-400 pt-2 space-y-1">
          <p>TravelPanel · Local-first travel inspiration</p>
          <p>Data lives on this device. Export regularly to prevent loss.</p>
        </div>

      </div>

      <NavBar active="home" />
    </div>
  );
}
