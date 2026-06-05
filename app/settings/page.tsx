'use client';

import { useRef, useState } from 'react';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, importBackup, ImportResult } from '@/lib/exportData';

type ExportState = 'idle' | 'exporting' | 'done' | 'error';
type ImportState = 'idle' | 'importing' | 'done' | 'error';

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExportState('exporting');
    try {
      await exportAllData();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState('importing');
    setImportResult(null);
    setImportError('');
    try {
      const result = await importBackup(file);
      setImportResult(result);
      setImportState('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
      setImportState('error');
    }
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-5 safe-top">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Data</h2>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Download size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Export all data</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Downloads all your clips, boards, and trip plans as a JSON file.
                  Use this to back up your data or move to another device.
                </p>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                exportState === 'done'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : exportState === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98'
              } disabled:opacity-60`}
            >
              {exportState === 'done' ? (
                <><CheckCircle2 size={16} /> Downloaded!</>
              ) : exportState === 'error' ? (
                <><AlertCircle size={16} /> Export failed — try again</>
              ) : exportState === 'exporting' ? (
                <span className="animate-pulse">Preparing…</span>
              ) : (
                <><Download size={16} /> Download backup (.json)</>
              )}
            </button>
          </div>
        </section>

        {/* ── Import ──────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Restore</h2>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Upload size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Import from backup</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restore from a TravelPanel .json backup file.
                  Existing clips and boards are preserved — only new ones are added.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'importing'}
              className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {importState === 'importing' ? (
                <span className="animate-pulse">Importing…</span>
              ) : (
                <><Upload size={16} /> Choose .json backup</>
              )}
            </button>

            {importState === 'done' && importResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 space-y-0.5">
                <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 size={15} /> Import complete</p>
                <p>+{importResult.itemsImported} clips · +{importResult.boardsImported} boards · +{importResult.tripsImported} trips</p>
                {importResult.skipped > 0 && <p className="text-green-600">{importResult.skipped} already existed (skipped)</p>}
                {importResult.errors.length > 0 && <p className="text-red-600 mt-1">{importResult.errors.length} errors</p>}
              </div>
            )}

            {importState === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                {importError || 'Import failed. Check the file and try again.'}
              </div>
            )}
          </div>
        </section>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">About</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">App</span>
              <span className="text-sm font-medium text-gray-900">TravelPanel</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm font-medium text-gray-400">v1.0 — Phase B</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data</span>
              <span className="text-sm font-medium text-gray-400">Stored locally on device</span>
            </div>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
