'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Info, Database, Map, BookOpen } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';

interface Stats {
  clips: number;
  boards: number;
  trips: number;
  locations: number;
  substanceItems: number;
}

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export default function SettingsPage() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  useEffect(() => {
    const load = async () => {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      setStats({
        clips:          items.filter(i => !i.isDemo).length,
        boards:         boards.filter(b => !b.isDemo).length,
        trips:          trips.length,
        locations:      items.reduce((s, i) => s + (i.locations?.length ?? 0), 0),
        substanceItems: items.reduce((s, i) => s + (i.substance?.length ?? 0), 0),
      });
    };
    load().catch(() => {});
  }, []);

  async function handleExport() {
    setExportState('exporting');
    try {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        counts: {
          items: items.length,
          boards: boards.length,
          trips: trips.length,
        },
        data: { items, boards, trips },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 pt-12 pb-4 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Stats card */}
        {stats && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Library</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-50 dark:divide-white/10">
              <StatCell label="Clips" value={stats.clips} icon="📎" />
              <StatCell label="Boards" value={stats.boards} icon="🗂" />
              <StatCell label="Plans" value={stats.trips} icon="🗺" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-50 dark:divide-white/10 border-t border-gray-50 dark:border-white/10">
              <StatCell label="Locations" value={stats.locations} icon="📍" />
              <StatCell label="Tips saved" value={stats.substanceItems} icon="💡" />
            </div>
          </div>
        )}

        {/* Data export */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Download size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data Backup</span>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Export all your clips, boards, and trip plans as a JSON file. Use this to back up
              your data or migrate to another device.
            </p>
            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                exportState === 'done'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : exportState === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 disabled:opacity-60'
              }`}
            >
              {exportState === 'exporting' ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  <span>Preparing export…</span>
                </>
              ) : exportState === 'done' ? (
                <>
                  <span>✓</span>
                  <span>Downloaded!</span>
                </>
              ) : exportState === 'error' ? (
                <>
                  <span>✗</span>
                  <span>Export failed — try again</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download all my data</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Includes all clips, boards, and itineraries in JSON format
            </p>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">About</span>
            </div>
          </div>
          <div className="px-4 py-4 space-y-2">
            <AboutRow label="App" value="TravelPanel" />
            <AboutRow label="Phase" value="A — Bug-Free MVP" />
            <AboutRow label="Storage" value="Local (IndexedDB)" />
            <AboutRow label="AI" value="Claude (Anthropic)" />
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

function StatCell({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex flex-col items-center py-4 gap-0.5">
      <span className="text-lg">{icon}</span>
      <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}
