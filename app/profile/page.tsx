'use client';

import { useState, useEffect } from 'react';
import { Download, Database, CheckCircle2, Loader2, BookOpen, MapPin, Route } from 'lucide-react';
import { getAllItems, getAllBoards } from '@/lib/db';
import { exportAllData } from '@/lib/exportData';
import NavBar from '@/components/NavBar';

interface Stats {
  items: number;
  boards: number;
  withSubstance: number;
  withLocations: number;
}

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export default function ProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportedCounts, setExportedCounts] = useState<{ itemCount: number; boardCount: number; tripCount: number } | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
        setStats({
          items: items.length,
          boards: boards.length,
          withSubstance: items.filter((i) => i.substance && i.substance.length > 0).length,
          withLocations: items.filter((i) => i.locations && i.locations.length > 0).length,
        });
      } catch {
        // IndexedDB not available
      }
    }
    loadStats();
  }, []);

  async function handleExport() {
    setExportState('exporting');
    try {
      const counts = await exportAllData();
      setExportedCounts(counts);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-page-safe">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-header-safe pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Stats card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Your Library</h2>
          {stats === null ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={<BookOpen size={18} className="text-indigo-500" />} value={stats.items} label="Clips saved" />
              <StatTile icon={<Database size={18} className="text-emerald-500" />} value={stats.boards} label="Collections" />
              <StatTile icon={<MapPin size={18} className="text-orange-500" />} value={stats.withLocations} label="With locations" />
              <StatTile icon={<Route size={18} className="text-purple-500" />} value={stats.withSubstance} label="With wisdom" />
            </div>
          )}
        </div>

        {/* Export card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Export</h2>
          <p className="text-sm text-gray-500 mb-4">
            Download all your clips, collections, and trip plans as a single JSON file. Use it as a backup or to migrate to another device.
          </p>

          {exportState === 'done' && exportedCounts ? (
            <div className="flex items-start gap-3 bg-emerald-50 rounded-xl p-4 mb-3">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Export complete</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {exportedCounts.itemCount} clip{exportedCounts.itemCount !== 1 ? 's' : ''},{' '}
                  {exportedCounts.boardCount} collection{exportedCounts.boardCount !== 1 ? 's' : ''},{' '}
                  {exportedCounts.tripCount} plan{exportedCounts.tripCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : exportState === 'error' ? (
            <div className="bg-red-50 rounded-xl p-4 mb-3">
              <p className="text-sm text-red-700">Export failed. Please try again.</p>
            </div>
          ) : null}

          <button
            onClick={handleExport}
            disabled={exportState === 'exporting'}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportState === 'exporting' ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Preparing export…
              </>
            ) : (
              <>
                <Download size={17} />
                Download all data (JSON)
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Includes clips, wisdom, GPS pins, collections, and trip plans
          </p>
        </div>

        {/* Coming soon: auth */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 opacity-60">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Cloud Sync</h2>
          <p className="text-sm text-gray-400">
            Sign in to sync your clips across devices and access them on the web. Coming soon.
          </p>
          <button
            disabled
            className="mt-4 w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-semibold cursor-not-allowed"
          >
            Sign in — coming soon
          </button>
        </div>
      </div>

      <NavBar active="profile" />
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-lg font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
