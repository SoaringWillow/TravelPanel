'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Upload, Trash2, ChevronRight, Globe2, Shield, AlertTriangle,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, triggerJSONDownload, importFromBackup } from '@/lib/exportData';
import { getAllItems, getAllBoards } from '@/lib/db';
import { track } from '@/lib/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let toastSeq = 0;

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exporting, setExporting]     = useState(false);
  const [importing, setImporting]     = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  function addToast(kind: ToastKind, message: string) {
    const id = ++toastSeq;
    setToasts(p => [...p, { id, kind, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportAllData();
      triggerJSONDownload(data);
      track('data_exported', {
        itemCount:  data.items.length,
        boardCount: data.boards.length,
      });
      addToast('success', `Exported ${data.items.length} clips and ${data.boards.length} boards.`);
    } catch {
      addToast('error', 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    try {
      const result = await importFromBackup(file);
      const total = result.itemsImported + result.boardsImported + result.tripsImported;
      if (result.errors.length) {
        addToast('info', `Imported ${total} items (${result.errors.length} skipped). Refresh to see changes.`);
      } else {
        addToast('success', `Imported ${result.itemsImported} clips, ${result.boardsImported} boards. Refresh to see them.`);
      }
      track('data_imported', {
        itemsImported:  result.itemsImported,
        boardsImported: result.boardsImported,
      });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  // ── Clear all data ─────────────────────────────────────────────────────────

  async function handleClearAll() {
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const { deleteItem, deleteBoard } = await import('@/lib/db');
      await Promise.all([
        ...items.map(i => deleteItem(i.id)),
        ...boards.map(b => deleteBoard(b.id)),
      ]);
      addToast('success', 'All data cleared. Refresh to see the empty state.');
      track('data_cleared', { itemCount: items.length });
    } catch {
      addToast('error', 'Clear failed. Please try again.');
    } finally {
      setConfirmClear(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Data backup section ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            Your Data
          </p>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-t-2xl disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                {exporting
                  ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  : <Download size={17} className="text-indigo-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {exporting ? 'Exporting…' : 'Export all data'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Download your clips, boards, and trips as JSON
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-b-2xl disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                {importing
                  ? <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  : <Upload size={17} className="text-green-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {importing ? 'Importing…' : 'Restore from backup'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Import a TravelPanel backup JSON file
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportFile}
            />
          </div>
        </section>

        {/* ── About section ────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            About
          </p>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Globe2 size={17} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">TravelPanel</p>
                <p className="text-xs text-gray-400">Travel inspiration clipper + AI trip planner</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Shield size={17} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Data stored locally</p>
                <p className="text-xs text-gray-400">Your clips live in your browser (IndexedDB)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Danger zone ──────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            Danger Zone
          </p>
          <div className="bg-white rounded-2xl shadow-sm">
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-red-50 active:bg-red-100 transition-colors rounded-2xl"
              >
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={17} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">Clear all data</p>
                  <p className="text-xs text-gray-400">Permanently delete all clips and boards</p>
                </div>
              </button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-4"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">
                      This will permanently delete all your clips, boards, and trips. Export first if you want a backup.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                    >
                      Delete everything
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>

      </div>

      {/* Toasts */}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
                t.kind === 'success' ? 'bg-green-600 text-white' :
                t.kind === 'error'   ? 'bg-red-600 text-white' :
                                       'bg-gray-800 text-white'
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
