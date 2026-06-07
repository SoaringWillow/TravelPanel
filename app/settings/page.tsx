'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Database,
  Map,
  Layers,
  Compass,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';
import { buildExportPayload, downloadJSON } from '@/lib/exportData';

// ─── Types ───────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'building' | 'done' | 'error';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-base font-bold text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [itemCount,  setItemCount]  = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [lastExport,  setLastExport]  = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.length);
    });

    const stored = localStorage.getItem('tp_last_export');
    if (stored) setLastExport(stored);
  }, []);

  async function handleExport() {
    setExportState('building');
    try {
      const payload = await buildExportPayload();
      downloadJSON(payload);
      const now = new Date().toLocaleDateString();
      localStorage.setItem('tp_last_export', now);
      setLastExport(now);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 safe-top">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-6 space-y-6">

        {/* Stats */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Your Data
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Map}
              label="Clips saved"
              value={itemCount ?? '—'}
              color="bg-indigo-500"
            />
            <StatCard
              icon={Layers}
              label="Collections"
              value={boardCount ?? '—'}
              color="bg-violet-500"
            />
            <StatCard
              icon={Compass}
              label="Storage"
              value="On device"
              color="bg-sky-500"
            />
            <StatCard
              icon={Database}
              label="Cloud sync"
              value="Coming soon"
              color="bg-gray-400"
            />
          </div>
        </section>

        {/* Data export */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Backup
          </h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl mt-0.5">
                  <Download size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Download all my data</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                    Export all clips, collections, and trip plans as a JSON file.
                    Use this to back up your data or move it to another device.
                  </p>
                  {lastExport && (
                    <p className="text-xs text-gray-400 mt-1.5">Last exported: {lastExport}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exportState === 'building'}
              className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
                exportState === 'building'
                  ? 'opacity-60 cursor-not-allowed bg-gray-50'
                  : exportState === 'done'
                  ? 'bg-green-50'
                  : exportState === 'error'
                  ? 'bg-red-50'
                  : 'hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {exportState === 'building' && (
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                )}
                {exportState === 'done' && <CheckCircle2 size={16} className="text-green-600" />}
                {exportState === 'error' && <AlertCircle size={16} className="text-red-500" />}
                {exportState === 'idle' && <Download size={16} className="text-indigo-600" />}

                <span className={`text-sm font-semibold ${
                  exportState === 'done'  ? 'text-green-700' :
                  exportState === 'error' ? 'text-red-600' :
                  'text-indigo-600'
                }`}>
                  {exportState === 'building' ? 'Building export…' :
                   exportState === 'done'     ? 'Downloaded!' :
                   exportState === 'error'    ? 'Export failed — try again' :
                   'Export JSON backup'}
                </span>
              </div>
              {exportState === 'idle' && <ChevronRight size={16} className="text-gray-400" />}
            </button>
          </div>

          <p className="text-xs text-gray-400 px-1 leading-relaxed">
            Your data is stored locally on this device. Exporting regularly protects against
            accidental loss. Cloud backup is coming in a future update.
          </p>
        </section>

        {/* Coming soon */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Coming Soon
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {[
              { label: 'Cloud sync', sub: 'Sign in to keep your data safe across devices' },
              { label: 'Import backup', sub: 'Restore from a JSON backup file' },
              { label: 'Theme', sub: 'Light / dark / auto' },
              { label: 'Data & Privacy', sub: 'What data we collect and why' },
            ].map(({ label, sub }) => (
              <div key={label} className="px-4 py-3.5 flex items-center justify-between opacity-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))}
          </div>
        </section>

        {/* Version */}
        <p className="text-center text-xs text-gray-300 pt-2">
          TravelPanel v1.0 · Built with ♥ using Claude
        </p>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
