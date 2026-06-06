'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Info, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadBackupJSON, importBackupJSON, ImportSummary } from '@/lib/exportData';
import { getAllItems, getAllBoards } from '@/lib/db';

type ExportState = 'idle' | 'loading' | 'done' | 'error';
type ImportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState('');
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lazy-load counts on first render
  useState(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    }).catch(() => {});
  });

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await exportAllData();
      downloadBackupJSON(data);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportState('loading');
    setImportError('');
    setImportSummary(null);
    try {
      const summary = await importBackupJSON(file);
      setImportSummary(summary);
      setImportState('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
      setImportState('error');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Stats card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Data</p>
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-bold text-gray-900">{itemCount ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">clips saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{boardCount ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">collections</div>
            </div>
          </div>
        </div>

        {/* Backup section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Backup & Restore</p>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exportState === 'loading'}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-50 first:border-0 disabled:opacity-60"
          >
            {exportState === 'done' ? (
              <CheckCircle2 size={20} className="text-green-500 shrink-0" />
            ) : exportState === 'error' ? (
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
            ) : (
              <Download size={20} className="text-indigo-600 shrink-0" />
            )}
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-800">
                {exportState === 'loading' ? 'Preparing download…'
                  : exportState === 'done' ? 'Download started'
                  : exportState === 'error' ? 'Export failed'
                  : 'Export all data'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Download a JSON file with all your clips, boards, and trips
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </button>

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importState === 'loading'}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100 disabled:opacity-60"
          >
            {importState === 'done' ? (
              <CheckCircle2 size={20} className="text-green-500 shrink-0" />
            ) : importState === 'error' ? (
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
            ) : (
              <Upload size={20} className="text-indigo-600 shrink-0" />
            )}
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-800">
                {importState === 'loading' ? 'Importing…'
                  : importState === 'done' ? 'Import complete'
                  : importState === 'error' ? 'Import failed'
                  : 'Import from backup'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {importState === 'done' && importSummary
                  ? `Added ${importSummary.items} clips, ${importSummary.boards} boards${importSummary.skipped > 0 ? ` (${importSummary.skipped} already existed)` : ''}`
                  : importState === 'error'
                  ? importError
                  : 'Restore a previous TravelPanel backup'}
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">About</p>
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-gray-50">
            <Info size={20} className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">TravelPanel</div>
              <div className="text-xs text-gray-400 mt-0.5">Travel inspiration clipper · v1.0</div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider px-4 pt-4 pb-2">Danger Zone</p>
          <button
            onClick={async () => {
              if (!confirm('Delete ALL clips, boards, and trips? This cannot be undone.\n\nExport a backup first if you want to keep your data.')) return;
              const { deleteBoard, deleteItem, deleteTrip, getAllItems: gi, getAllBoards: gb, getTripsForBoard: gt } = await import('@/lib/db');
              const [items, boards] = await Promise.all([gi(), gb()]);
              const tripArrs = await Promise.all(boards.map((b) => gt(b.id)));
              const trips = tripArrs.flat();
              await Promise.all([
                ...items.map((i) => deleteItem(i.id)),
                ...boards.map((b) => deleteBoard(b.id)),
                ...trips.map((t) => deleteTrip(t.id)),
              ]);
              window.location.reload();
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors border-t border-red-50"
          >
            <Trash2 size={20} className="text-red-500 shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-red-700">Delete all data</div>
              <div className="text-xs text-red-400 mt-0.5">Permanently removes all clips, boards, and trips</div>
            </div>
          </button>
        </div>
      </div>

      <NavBar active="settings" />
    </main>
  );
}
