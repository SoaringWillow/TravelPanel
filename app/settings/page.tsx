'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { buildExportBundle, downloadJSON, importBundle } from '@/lib/exportData';
import { getAllItems, getAllBoards } from '@/lib/db';
import NavBar from '@/components/NavBar';

type AsyncState = 'idle' | 'loading' | 'done' | 'error';

interface ImportMsg { type: 'success' | 'error'; text: string }

export default function SettingsPage() {
  const [itemCount, setItemCount]   = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [exportState, setExportState] = useState<AsyncState>('idle');
  const [importMsg, setImportMsg]   = useState<ImportMsg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    }).catch(() => { setItemCount(0); setBoardCount(0); });
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const bundle = await buildExportBundle();
      downloadJSON(bundle);
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
    // Reset so same file can be re-selected
    e.target.value = '';

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const result = await importBundle(raw);

      const parts: string[] = [];
      if (result.imported > 0) parts.push(`Imported ${result.imported} item${result.imported !== 1 ? 's' : ''}`);
      if (result.skipped > 0) parts.push(`${result.skipped} already existed — skipped`);
      if (result.errors > 0) parts.push(`${result.errors} failed`);

      setImportMsg({ type: 'success', text: parts.join(', ') + '.' });

      // Refresh counts
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed — please try again.';
      setImportMsg({ type: 'error', text: msg });
    }

    setTimeout(() => setImportMsg(null), 5000);
  }

  const exportLabel = { idle: 'Download my data', loading: 'Preparing export…', done: 'Downloaded!', error: 'Export failed — try again' }[exportState];
  const exportIcon  = exportState === 'done' ? <CheckCircle2 size={17} /> : exportState === 'error' ? <AlertCircle size={17} /> : <Download size={17} />;
  const exportColor = exportState === 'done' ? 'bg-green-600' : exportState === 'error' ? 'bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Data section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Database size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Your data</h2>
              <p className="text-xs text-gray-500">Stored locally on this device</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-indigo-600 tabular-nums">{itemCount ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{itemCount === 1 ? 'clip' : 'clips'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-indigo-600 tabular-nums">{boardCount ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{boardCount === 1 ? 'board' : 'boards'}</div>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Export a full JSON backup of all your clips, boards, and planned trips.
            Import it on any device to restore your data — existing items are never overwritten.
          </p>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exportState === 'loading' || itemCount === null}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mb-3 ${exportColor}`}
          >
            {exportIcon}
            {exportLabel}
          </button>

          {/* Import button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-indigo-600 text-sm font-semibold border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-[0.98]"
          >
            <Upload size={17} />
            Import from backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Import result toast */}
          {importMsg && (
            <div className={`mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium ${importMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {importMsg.type === 'success' ? <CheckCircle2 size={14} className="flex-shrink-0 mt-px" /> : <AlertCircle size={14} className="flex-shrink-0 mt-px" />}
              {importMsg.text}
            </div>
          )}
        </div>

        {/* About section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">About TravelPanel</h2>
          <div className="space-y-2 text-xs text-gray-500">
            <p>Save travel inspiration from anywhere — Instagram, YouTube, Xiaohongshu — and let Claude extract the locations and wisdom so you never lose a good tip.</p>
            <p className="text-indigo-600 font-medium">v1.0 — Local-first, your data stays on your device.</p>
          </div>
        </div>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
