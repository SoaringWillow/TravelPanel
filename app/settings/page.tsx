'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, Database, Info, CheckCircle2, Loader2, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, downloadAsJSON } from '@/lib/exportData';
import { restoreFromJSON } from '@/lib/importData';

interface Stats {
  clips: number;
  boards: number;
  trips: number;
  substanceItems: number;
  locations: number;
}

type ExportState = 'idle' | 'exporting' | 'done';
type ImportState = 'idle' | 'importing' | 'done' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stats, setStats]           = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importSummary, setImportSummary] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [items, boards, trips] = await Promise.all([
      getAllItems(),
      getAllBoards(),
      getAllTrips(),
    ]);
    setStats({
      clips:          items.length,
      boards:         boards.length,
      trips:          trips.length,
      substanceItems: items.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
      locations:      items.reduce((n, i) => n + (i.locations?.length ?? 0), 0),
    });
  }

  async function handleExport() {
    setExportState('exporting');
    try {
      const data = await exportAllData();
      downloadAsJSON(data);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('idle');
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportState('importing');
    setImportSummary('');

    try {
      const text   = await file.text();
      const result = await restoreFromJSON(text);

      if (result.errors.length > 0 && result.clipsRestored === 0 && result.boardsRestored === 0) {
        setImportSummary(result.errors[0]);
        setImportState('error');
        setTimeout(() => setImportState('idle'), 5000);
        return;
      }

      const parts: string[] = [];
      if (result.clipsRestored > 0)  parts.push(`${result.clipsRestored} clips`);
      if (result.boardsRestored > 0) parts.push(`${result.boardsRestored} boards`);
      const skipped = result.clipsSkipped + result.boardsSkipped;
      const summary = parts.length > 0
        ? `Restored ${parts.join(' and ')}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
        : 'Nothing new to restore — all items already exist.';

      setImportSummary(summary);
      setImportState('done');
      await loadStats();
      setTimeout(() => { setImportState('idle'); setImportSummary(''); }, 5000);
    } catch {
      setImportSummary('Could not read the file.');
      setImportState('error');
      setTimeout(() => setImportState('idle'), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 pt-6 space-y-5">

        {/* ── Stats card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Database size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Your data</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Clips',  value: stats?.clips  },
              { label: 'Boards', value: stats?.boards },
              { label: 'Trips',  value: stats?.trips  },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-4">
                <span className="text-2xl font-bold text-indigo-600">{value ?? '—'}</span>
                <span className="text-xs text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
          {stats && (stats.locations > 0 || stats.substanceItems > 0) && (
            <div className="px-4 pb-4 pt-1 flex gap-4">
              <span className="text-xs text-gray-400">
                📍 <strong className="text-gray-600">{stats.locations}</strong> locations mapped
              </span>
              <span className="text-xs text-gray-400">
                💡 <strong className="text-gray-600">{stats.substanceItems}</strong> wisdom items
              </span>
            </div>
          )}
        </div>

        {/* ── Backup & Restore ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Download size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Backup &amp; Restore</span>
          </div>

          <div className="px-4 py-4 space-y-3">
            {/* Export */}
            <div>
              <p className="text-sm text-gray-700 font-medium">Download all my data</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Exports clips, boards, trips, and substance items as a JSON file.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportState !== 'idle'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                exportState === 'done'
                  ? 'bg-green-500 text-white'
                  : exportState === 'exporting'
                    ? 'bg-indigo-400 text-white cursor-wait'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              {exportState === 'exporting' ? (
                <><Loader2 size={15} className="animate-spin" /> Preparing…</>
              ) : exportState === 'done' ? (
                <><CheckCircle2 size={15} /> Downloaded!</>
              ) : (
                <><Download size={15} /> Export as JSON</>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Import */}
            <div>
              <p className="text-sm text-gray-700 font-medium">Restore from backup</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Upload a previously exported JSON file. Existing items are kept — duplicates are skipped.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'importing'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                importState === 'done'
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : importState === 'error'
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : importState === 'importing'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-400 cursor-wait'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-600 active:scale-[0.98]'
              }`}
            >
              {importState === 'importing' ? (
                <><Loader2 size={15} className="animate-spin" /> Restoring…</>
              ) : importState === 'done' ? (
                <><CheckCircle2 size={15} /> Done</>
              ) : importState === 'error' ? (
                <><AlertCircle size={15} /> Error</>
              ) : (
                <><Upload size={15} /> Restore from JSON</>
              )}
            </button>

            {importSummary && (
              <p className={`text-xs text-center font-medium ${importState === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                {importSummary}
              </p>
            )}
          </div>
        </div>

        {/* ── History ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Clock size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">History</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/timeline')}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 text-left">Trip history</p>
              <p className="text-xs text-gray-400 text-left mt-0.5">
                Browse all itineraries you&apos;ve generated
                {stats?.trips ? ` · ${stats.trips} plan${stats.trips !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <Info size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">About</span>
          </div>
          <div className="px-4 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">App</span>
              <span className="text-sm font-medium text-gray-900">TravelPanel</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm text-gray-900">Local (IndexedDB)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI extraction</span>
              <span className="text-sm text-gray-900">Claude (Anthropic)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cloud sync</span>
              <span className="text-sm text-indigo-500">Coming soon</span>
            </div>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
