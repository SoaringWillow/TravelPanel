'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';
import { exportAndDownload } from '@/lib/exportData';
import { track } from '@/lib/analytics';

type ExportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [itemCount, setItemCount]   = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportMeta, setExportMeta] = useState<{ itemCount: number; boardCount: number; tripCount: number } | null>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    });
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const bundle = await exportAndDownload();
      setExportMeta(bundle.meta);
      setExportState('done');
      track('data_exported', { itemCount: bundle.meta.itemCount });
    } catch {
      setExportState('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Data overview card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Database size={17} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-800">Your Data</h2>
            </div>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {itemCount === null ? '—' : itemCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Saved clips</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {boardCount === null ? '—' : boardCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Boards</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Data is stored locally on this device. Use the export below to back it up
              before switching browsers or devices.
            </p>
          </div>
        </section>

        {/* Export card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Download size={17} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-800">Export Backup</h2>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Download all your clips, boards, and trip plans as a single JSON file.
              The file includes all locations, substance wisdom, and sourced tips.
            </p>

            {exportState === 'done' && exportMeta && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Download started</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {exportMeta.itemCount} clips · {exportMeta.boardCount} boards · {exportMeta.tripCount} trips
                  </p>
                </div>
              </div>
            )}

            {exportState === 'error' && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">Export failed. Please try again.</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-colors"
            >
              {exportState === 'loading' ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download All Data (JSON)
                </>
              )}
            </button>

            <p className="text-xs text-gray-400">
              File format: <code className="bg-gray-100 px-1 rounded">travelpanel-backup-YYYY-MM-DD.json</code>
            </p>
          </div>
        </section>

        {/* Import placeholder card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-60">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={17} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500">Import Backup</h2>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Restore from a previous backup or migrate data from another device.
            </p>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-50">
            <div className="flex items-center gap-2">
              <Trash2 size={17} className="text-red-400" />
              <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              Clearing your data is permanent and cannot be undone. Export a backup first.
            </p>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-400 font-semibold text-sm py-2.5 px-4 rounded-xl opacity-50 cursor-not-allowed"
            >
              <Trash2 size={15} />
              Clear All Data
            </button>
            <p className="text-xs text-gray-400">Disabled until cloud backup (B1) is active.</p>
          </div>
        </section>

        {/* Version footer */}
        <p className="text-center text-xs text-gray-300 pt-2">TravelPanel v1 · Phase A+B</p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
