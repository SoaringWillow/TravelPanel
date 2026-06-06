'use client';

import { useState, useEffect } from 'react';
import { Download, Database, FileJson, Layers, Map, Trash2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { buildExportBundle, downloadJSON } from '@/lib/exportData';

interface Stats {
  itemCount: number;
  boardCount: number;
  tripCount: number;
}

type ExportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  useEffect(() => {
    async function loadStats() {
      const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);
      setStats({
        itemCount: items.filter((i) => !i.isDemo).length,
        boardCount: boards.filter((b) => !b.isDemo).length,
        tripCount: trips.length,
      });
    }
    loadStats();
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const bundle = await buildExportBundle();
      downloadJSON(bundle);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  const exportLabel =
    exportState === 'loading' ? 'Preparing export…' :
    exportState === 'done'    ? '✓ Download started!' :
    exportState === 'error'   ? 'Export failed — try again' :
                                'Download all my data';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-5 safe-top">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Stats card */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Your Data
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            <StatRow
              icon={<Database size={16} className="text-indigo-500" />}
              label="Saved clips"
              value={stats ? stats.itemCount.toString() : '—'}
            />
            <StatRow
              icon={<Layers size={16} className="text-purple-500" />}
              label="Collections"
              value={stats ? stats.boardCount.toString() : '—'}
            />
            <StatRow
              icon={<Map size={16} className="text-emerald-500" />}
              label="Trip plans"
              value={stats ? stats.tripCount.toString() : '—'}
            />
          </div>
        </section>

        {/* Export section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Backup & Export
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileJson size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">JSON Backup</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Downloads all your clips, collections, and trip plans as a single JSON file.
                    Keep a copy in case you switch devices.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exportState === 'loading'}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  exportState === 'done'
                    ? 'bg-emerald-500 text-white'
                    : exportState === 'error'
                    ? 'bg-red-500 text-white'
                    : exportState === 'loading'
                    ? 'bg-indigo-100 text-indigo-400 cursor-wait'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                <Download size={16} />
                {exportLabel}
              </button>

              {stats && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  {stats.itemCount} clip{stats.itemCount !== 1 ? 's' : ''} ·{' '}
                  {stats.boardCount} collection{stats.boardCount !== 1 ? 's' : ''} ·{' '}
                  {stats.tripCount} plan{stats.tripCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="bg-amber-50 border-t border-amber-100 px-4 py-3 flex items-center gap-2">
              <Trash2 size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>TravelPanel is local-first.</strong> Your data lives on this device.
                Export regularly to avoid loss on reinstall.
              </p>
            </div>
          </div>
        </section>

        {/* App info */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            <StatRow label="Version" value="1.0.0" />
            <StatRow label="Storage" value="Local (IndexedDB)" />
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
