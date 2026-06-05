'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Map, Inbox, LayoutGrid, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, downloadJSON } from '@/lib/exportData';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportDone(false);
    try {
      const data = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `travelpanel-export-${date}.json`);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 safe-top">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Data stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your data</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile icon={<Inbox size={16} className="text-indigo-500" />} label="Clips" value={stats?.items ?? '—'} />
            <StatTile icon={<LayoutGrid size={16} className="text-indigo-500" />} label="Boards" value={stats?.boards ?? '—'} />
            <StatTile icon={<Map size={16} className="text-indigo-500" />} label="Plans" value={stats?.trips ?? '—'} />
          </div>
        </div>

        {/* Export */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Backup & Export</p>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Download size={16} className="text-indigo-600" />
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">
                {exporting ? 'Exporting…' : exportDone ? '✓ Downloaded!' : 'Download all my data'}
              </p>
              <p className="text-xs text-gray-500">
                Clips, boards, and trip plans as JSON
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>

          <div className="mx-4 border-t border-gray-50" />

          <div className="px-4 py-3 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database size={16} className="text-gray-400" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-700">Local storage</p>
              <p className="text-xs text-gray-400 leading-snug mt-0.5">
                All data lives on this device. Export regularly to avoid losing it.
                Cloud sync coming in a future update.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
          <Row label="App" value="TravelPanel" />
          <Row label="Version" value="1.0.0" />
          <Row label="Data" value="Stored locally on device" />
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1 bg-gray-50 rounded-xl">
      {icon}
      <span className="text-lg font-bold text-gray-900 tabular-nums leading-none">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
