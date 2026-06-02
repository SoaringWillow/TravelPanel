'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Download, Upload, Trash2, CheckCircle2, AlertCircle,
  Database, Globe2, Shield, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, importBackup } from '@/lib/exportData';

type Toast = { type: 'success' | 'error'; message: string };

export default function SettingsPage() {
  const [stats, setStats]     = useState({ items: 0, boards: 0, trips: 0 });
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast]     = useState<Toast | null>(null);
  const fileInputRef           = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
  }, []);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportAllData();
      showToast({ type: 'success', message: `Exported ${result.items} clips, ${result.boards} boards, ${result.trips} plans.` });
    } catch {
      showToast({ type: 'error', message: 'Export failed. Try again.' });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importBackup(file);
      setStats(await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([i, b, t]) => ({ items: i.length, boards: b.length, trips: t.length })));
      showToast({ type: 'success', message: `Imported ${result.items} clips, ${result.boards} boards, ${result.trips} plans.` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Import failed.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 safe-top">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Data & Storage card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data & Storage</span>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
            <span className="text-sm text-gray-700">Saved clips</span>
            <span className="text-sm font-semibold text-gray-900">{stats.items}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
            <span className="text-sm text-gray-700">Collections</span>
            <span className="text-sm font-semibold text-gray-900">{stats.boards}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">Saved plans</span>
            <span className="text-sm font-semibold text-gray-900">{stats.trips}</span>
          </div>
        </div>

        {/* Backup & Restore card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Backup & Restore</span>
            </div>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || stats.items === 0}
            className="w-full px-4 py-4 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {exporting ? 'Exporting…' : 'Download all my data'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Saves clips, boards, and plans as a JSON file
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {importing ? 'Importing…' : 'Restore from backup'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Merges data from a previously exported JSON file
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Danger Zone</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('This will permanently delete all your clips, boards, and plans. This cannot be undone.\n\nExport a backup first!')) {
                indexedDB.deleteDatabase('travel-panel');
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-600">Clear all data</div>
              <div className="text-xs text-gray-500 mt-0.5">Permanently delete all clips and boards</div>
            </div>
          </button>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Globe2 size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About</span>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
            <span className="text-sm text-gray-700">Version</span>
            <span className="text-sm font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">Data stored</span>
            <span className="text-sm font-medium text-gray-500">On this device</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className={`fixed bottom-24 left-4 right-4 z-[2000] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 size={18} />
              : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="settings" />
    </div>
  );
}
