'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData } from '@/lib/exportData';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';

export default function SettingsPage() {
  const [stats, setStats]           = useState({ items: 0, boards: 0, trips: 0 });
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()])
      .then(([items, boards, trips]) => setStats({ items: items.length, boards: boards.length, trips: trips.length }))
      .catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    setExported(false);
    setExportError('');
    try {
      await exportAllData();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 safe-top">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Data summary card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Database size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Your Data</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stored locally on this device</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Clips',       value: stats.items  },
              { label: 'Collections', value: stats.boards },
              { label: 'Plans',       value: stats.trips  },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Download size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Export All Data</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Download a backup as JSON</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Exports all your clips, collections, and trip plans as a single JSON file.
            Keep it as a backup or use it to migrate to a new device.
          </p>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || stats.items + stats.boards + stats.trips === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Preparing download…
              </>
            ) : exported ? (
              <>
                <CheckCircle2 size={17} />
                Downloaded!
              </>
            ) : (
              <>
                <Download size={17} />
                Download backup
                {stats.items > 0 && (
                  <span className="ml-1 text-green-200 font-normal">
                    ({stats.items} clip{stats.items !== 1 ? 's' : ''})
                  </span>
                )}
              </>
            )}
          </button>

          {exportError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              {exportError}
            </p>
          )}

          <p className="mt-3 text-xs text-gray-400">
            File format: <code className="bg-gray-100 px-1 py-0.5 rounded">travelpanel-backup-YYYY-MM-DD.json</code>
          </p>
        </div>

        {/* Data location notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Data stored locally</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your clips live in this browser&apos;s IndexedDB. Clearing browser data or switching devices will lose your clips.
              Export regularly to avoid data loss. Cloud sync is coming in a future update.
            </p>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
