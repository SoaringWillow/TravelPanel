'use client';

import { useState, useEffect } from 'react';
import {
  Download, Trash2, Database, Info, ChevronRight,
  CheckCircle2, AlertCircle, Cloud,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';
import { exportAllData, downloadJSON, buildExportFilename } from '@/lib/exportData';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

// ── Settings page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [itemCount,  setItemCount]  = useState(0);
  const [boardCount, setBoardCount] = useState(0);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportSize,  setExportSize]  = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.length);
      setBoardCount(boards.length);
    }).catch(() => {});
  }, []);

  async function handleExport() {
    setExportState('exporting');
    try {
      const data = await exportAllData();
      const filename = buildExportFilename();
      downloadJSON(data, filename);

      const bytes = JSON.stringify(data).length;
      setExportSize(bytes > 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`);
      setExportState('done');

      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-3">

        {/* ── Stats card ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              <Database size={12} />
              Your Library
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
            <div className="px-4 py-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{itemCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Saved clips</div>
            </div>
            <div className="px-4 py-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{boardCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Collections</div>
            </div>
          </div>
        </div>

        {/* ── Data & Privacy ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <Download size={12} />
              Data &amp; Privacy
            </div>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exportState === 'exporting'}
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
                ${exportState === 'done' ? 'bg-green-500' : exportState === 'error' ? 'bg-red-400' : 'bg-indigo-500'}`}>
                {exportState === 'done'
                  ? <CheckCircle2 size={16} />
                  : exportState === 'error'
                  ? <AlertCircle size={16} />
                  : <Download size={15} />}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {exportState === 'exporting' ? 'Exporting…'
                   : exportState === 'done'     ? `Downloaded! (${exportSize})`
                   : exportState === 'error'    ? 'Export failed'
                   : 'Download All My Data'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {exportState === 'done'
                    ? 'All clips, boards, and plans as JSON'
                    : 'Export clips, boards, and plans as JSON'}
                </div>
              </div>
            </div>
            {exportState === 'idle' && <ChevronRight size={16} className="text-gray-300" />}
          </button>

          {/* Clear data */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={15} className="text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-red-500">Clear All Data</div>
                <div className="text-xs text-gray-500 mt-0.5">Permanently delete all clips and boards</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* ── Cloud Sync (coming soon) ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm opacity-70">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <Cloud size={12} />
              Cloud Sync
            </div>
          </div>
          <div className="px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Cloud size={15} className="text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-400">Sign in &amp; Sync</div>
                <div className="text-xs text-gray-400 mt-0.5">Coming in Phase B — cross-device sync</div>
              </div>
            </div>
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">Soon</span>
          </div>
        </div>

        {/* ── About ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <Info size={12} />
              About
            </div>
          </div>
          <div className="px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-700">Version</span>
            <span className="text-sm text-gray-400">1.0.0</span>
          </div>
          <div className="px-4 py-3.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-700">Storage</span>
            <span className="text-sm text-gray-400">Local-first (IndexedDB)</span>
          </div>
        </div>

      </div>

      {/* ── Clear data confirmation modal ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">⚠️</div>
              <h2 className="text-base font-bold text-gray-900">Clear All Data?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This permanently deletes all {itemCount} clips and {boardCount} collections.
                Download a backup first if you want to keep them.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Delete the IndexedDB database and reload
                    indexedDB.deleteDatabase('travel-panel');
                    window.location.href = '/';
                  } catch { setShowClearConfirm(false); }
                }}
                className="w-full py-3 bg-red-500 text-white rounded-2xl font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar active="settings" />
    </div>
  );
}
