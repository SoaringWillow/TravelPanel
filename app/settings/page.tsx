'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Info, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadBackup, importBackup } from '@/lib/exportData';

type State = 'idle' | 'exporting' | 'importing' | 'clearing' | 'done' | 'error';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function SettingsPage() {
  const [state, setState] = useState<State>('idle');
  const [toast, setToast] = useState<Toast | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: Toast['type'], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleExport() {
    setState('exporting');
    try {
      const data = await exportAllData();
      downloadBackup(data);
      const total = data.items.length + data.boards.length + data.trips.length;
      showToast('success', `Downloaded ${data.items.length} clips, ${data.boards.length} boards, ${data.trips.length} trips`);
      void total;
    } catch (e) {
      showToast('error', `Export failed: ${e}`);
    } finally {
      setState('idle');
    }
  }

  async function handleImportFile(file: File) {
    setState('importing');
    try {
      const result = await importBackup(file, importMode);
      const msg = `Imported ${result.itemsImported} clips, ${result.boardsImported} boards, ${result.tripsImported} trips`;
      showToast('success', result.errors.length > 0 ? `${msg} (${result.errors.length} errors)` : msg);
    } catch (e) {
      showToast('error', `Import failed: ${e}`);
    } finally {
      setState('idle');
    }
  }

  async function handleClearAll() {
    setState('clearing');
    try {
      const { getAllItems, getAllBoards, getTripsForBoard, deleteItem, deleteBoard, deleteTrip } = await import('@/lib/db');
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      for (const item of items.filter((i) => !i.isDemo)) await deleteItem(item.id).catch(() => {});
      for (const board of boards.filter((b) => !b.isDemo)) {
        const trips = await getTripsForBoard(board.id);
        for (const t of trips) await deleteTrip(t.id).catch(() => {});
        await deleteBoard(board.id).catch(() => {});
      }
      showToast('success', 'All data cleared');
    } catch (e) {
      showToast('error', `Clear failed: ${e}`);
    } finally {
      setState('idle');
      setShowClearConfirm(false);
    }
  }

  const busy = state !== 'idle';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 flex items-start gap-3 p-4 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            : <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your data and preferences</p>
      </div>

      <div className="px-4 pt-6 space-y-4">

        {/* ── Export ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Backup & Restore
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">

            {/* Export */}
            <button
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
              onClick={handleExport}
              disabled={busy}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Download size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">Download my data</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {state === 'exporting' ? 'Preparing download…' : 'Export all clips, boards, and trip plans as JSON'}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>

            {/* Import */}
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Upload size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">Restore from backup</div>
                  <div className="text-sm text-gray-500 mt-0.5 mb-3">
                    Import a TravelPanel JSON backup file
                  </div>

                  {/* Merge vs Replace toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        importMode === 'merge'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      onClick={() => setImportMode('merge')}
                    >
                      Merge with existing
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        importMode === 'replace'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      onClick={() => setImportMode('replace')}
                    >
                      Replace all data
                    </button>
                  </div>
                  {importMode === 'replace' && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                      ⚠️ Replace mode will delete all existing clips and boards first
                    </p>
                  )}

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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <Upload size={15} />
                    {state === 'importing' ? 'Importing…' : 'Choose backup file'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Data ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Data
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {!showClearConfirm ? (
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                onClick={() => setShowClearConfirm(true)}
                disabled={busy}
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-red-600">Clear all data</div>
                  <div className="text-sm text-gray-500 mt-0.5">Permanently delete all clips, boards, and trips</div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            ) : (
              <div className="p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">Are you sure?</p>
                <p className="text-sm text-gray-500 mb-4">
                  This will permanently delete all your clips, boards, and trip plans. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    onClick={handleClearAll}
                    disabled={busy}
                  >
                    {state === 'clearing' ? 'Clearing…' : 'Yes, clear everything'}
                  </button>
                  <button
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                    onClick={() => setShowClearConfirm(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── About ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900 text-sm">TravelPanel</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  AI-powered travel inspiration clipper. Share any travel post from Instagram,
                  YouTube, or Xiaohongshu — Claude extracts locations and wisdom, then builds
                  a multi-day itinerary that cites your saved clips.
                </div>
              </div>
            </div>
            <div className="pl-7 text-xs text-gray-400 space-y-1">
              <div>Storage: local device (IndexedDB)</div>
              <div>AI: Anthropic Claude</div>
              <div>Maps: MapLibre + OpenFreeMap</div>
            </div>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
