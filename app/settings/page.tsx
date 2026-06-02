'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, importBackup, ImportResult } from '@/lib/exportData';
import { track } from '@/lib/analytics';

type Status = { type: 'success' | 'error'; msg: string } | null;

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState({ items: 0, boards: 0, trips: 0 });
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({
        items: items.filter((i) => !i.isDemo).length,
        boards: boards.filter((b) => !b.isDemo).length,
        trips: trips.length,
      });
    });
  }, []);

  function showStatus(type: 'success' | 'error', msg: string) {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 5000);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      await exportAllData();
      track('backup_exported', stats);
      showStatus('success', `Backup downloaded — ${stats.items} clips, ${stats.boards} boards`);
    } catch {
      showStatus('error', 'Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result: ImportResult = await importBackup(file);
      const { imported } = result;
      track('backup_imported', imported);
      showStatus(
        'success',
        `Imported ${imported.items} clips, ${imported.boards} boards, ${imported.trips} trips${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`
      );
      // Refresh stats
      const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);
      setStats({ items: items.filter((i) => !i.isDemo).length, boards: boards.filter((b) => !b.isDemo).length, trips: trips.length });
    } catch (err) {
      showStatus('error', err instanceof Error ? err.message : 'Import failed. Check the file format.');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleClearAll() {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 5000);
      return;
    }
    // Delete all non-demo data from IndexedDB
    try {
      const { getAllItems, getAllBoards, getAllTrips } = await import('@/lib/db');
      const { deleteItem, deleteBoard, deleteTrip } = await import('@/lib/db');
      const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);
      await Promise.all([
        ...items.filter((i) => !i.isDemo).map((i) => deleteItem(i.id)),
        ...boards.filter((b) => !b.isDemo).map((b) => deleteBoard(b.id)),
        ...trips.map((t) => deleteTrip(t.id)),
      ]);
      track('data_cleared');
      setStats({ items: 0, boards: 0, trips: 0 });
      setClearConfirm(false);
      showStatus('success', 'All your data has been cleared.');
    } catch {
      showStatus('error', 'Clear failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-24">

        {/* Status banner */}
        {status && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-medium ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {status.type === 'success'
              ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            {status.msg}
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your data</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Clips', value: stats.items },
              { label: 'Boards', value: stats.boards },
              { label: 'Trips', value: stats.trips },
            ].map(({ label, value }) => (
              <div key={label} className="text-center py-3 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Data management</h2>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exportLoading || stats.items === 0}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors disabled:opacity-50 border-t border-gray-50"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-indigo-600" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-gray-900 text-sm">
                {exportLoading ? 'Preparing download…' : 'Download backup'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Export all clips, boards &amp; trips as JSON
              </div>
            </div>
          </button>

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors disabled:opacity-50 border-t border-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="text-green-600" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-gray-900 text-sm">
                {importLoading ? 'Importing…' : 'Restore from backup'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Import a travelpanel-backup-*.json file
              </div>
            </div>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-red-400 uppercase tracking-widest">Danger zone</h2>
          </div>

          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-50 transition-colors border-t border-gray-50 group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div className="text-left flex-1">
              <div className={`font-semibold text-sm transition-colors ${clearConfirm ? 'text-red-600' : 'text-gray-900'}`}>
                {clearConfirm ? 'Tap again to confirm — this cannot be undone' : 'Clear all my data'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Permanently delete all clips, boards &amp; trips
              </div>
            </div>
          </button>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">About</h2>
          </div>
          <div className="px-4 pb-4 pt-2 space-y-2 text-sm text-gray-500">
            <p>TravelPanel — AI-powered travel inspiration clipper</p>
            <p className="text-xs">
              Save travel posts from anywhere. Claude AI extracts locations and wisdom. Plan trips with sourced itineraries.
            </p>
          </div>
        </div>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
