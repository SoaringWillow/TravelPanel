'use client';

import { useState, useEffect, useRef } from 'react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import { exportAllData, downloadBackup, importBackup } from '@/lib/exportData';
import NavBar from '@/components/NavBar';
import {
  Download,
  Upload,
  Database,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

type ExportState = 'idle' | 'loading' | 'done' | 'error';
type ImportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [stats, setStats]               = useState<Stats | null>(null);
  const [exportState, setExportState]   = useState<ExportState>('idle');
  const [importState, setImportState]   = useState<ImportState>('idle');
  const [importMsg, setImportMsg]       = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      setStats({
        items:  items.length,
        boards: boards.length,
        trips:  tripArrays.flat().length,
      });
    })();
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const backup = await exportAllData();
      downloadBackup(backup);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState('loading');
    setImportMsg('');
    try {
      const text = await file.text();
      const { imported, errors } = await importBackup(text);
      if (errors.length === 0) {
        setImportMsg(`Imported ${imported} clips successfully.`);
        setImportState('done');
      } else {
        setImportMsg(`Imported ${imported} clips. ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors[0]}`);
        setImportState('error');
      }
      // Refresh stats
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const ta = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      setStats({ items: items.length, boards: boards.length, trips: ta.flat().length });
    } catch {
      setImportMsg('Could not read file. Make sure it is a valid TravelPanel backup.');
      setImportState('error');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => { setImportState('idle'); setImportMsg(''); }, 5000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Data stats card */}
        <section className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Data</h2>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Clips',     value: stats?.items  },
              { label: 'Boards',    value: stats?.boards },
              { label: 'Itineraries', value: stats?.trips  },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {value === undefined ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-100 animate-pulse" />
                  ) : value}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Backup section */}
        <section className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Backup &amp; Restore</h2>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exportState === 'loading'}
            className="w-full flex items-center gap-3 px-4 py-4 text-left border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              {exportState === 'loading' ? (
                <Loader2 size={18} className="text-indigo-600 animate-spin" />
              ) : exportState === 'done' ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : exportState === 'error' ? (
                <AlertCircle size={18} className="text-red-500" />
              ) : (
                <Download size={18} className="text-indigo-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800">Export all data</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {exportState === 'done'   ? 'Download started!' :
                 exportState === 'error'  ? 'Export failed — try again' :
                 exportState === 'loading'? 'Preparing backup…' :
                 'Download a JSON backup of all clips, boards, and itineraries'}
              </div>
            </div>
            {exportState === 'idle' && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
          </button>

          {/* Import */}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'loading'}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                {importState === 'loading' ? (
                  <Loader2 size={18} className="text-emerald-600 animate-spin" />
                ) : importState === 'done' ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : importState === 'error' ? (
                  <AlertCircle size={18} className="text-red-500" />
                ) : (
                  <Upload size={18} className="text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800">Import from backup</div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                  {importMsg || 'Restore clips and boards from a JSON backup file'}
                </div>
              </div>
              {importState === 'idle' && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleImportFile}
            />
          </div>
        </section>

        {/* Storage info */}
        <section className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storage</h2>
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Database size={18} className="text-orange-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Local storage (IndexedDB)</div>
              <div className="text-xs text-gray-400 mt-0.5">
                All data lives on this device. Export regularly to prevent data loss.
                Cloud sync coming soon.
              </div>
            </div>
          </div>
        </section>

        {/* Version */}
        <p className="text-center text-xs text-gray-300 pt-2">TravelPanel v0.1</p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
