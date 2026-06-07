'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Map, Layers, Route, CheckCircle2, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJson } from '@/lib/exportData';
import { getAllItems, getAllBoards } from '@/lib/db';

type ExportState = 'idle' | 'loading' | 'done' | 'error';

export default function SettingsPage() {
  const [itemCount, setItemCount]   = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setItemCount(items.filter((i) => !i.isDemo).length);
      setBoardCount(boards.filter((b) => !b.isDemo).length);
    }).catch(() => {});
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `travelpanel-backup-${date}.json`);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">App preferences and data management</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Data summary card */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Your Data</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            <StatRow
              icon={<Map size={18} className="text-indigo-500" />}
              label="Saved clips"
              value={itemCount === null ? '…' : String(itemCount)}
            />
            <StatRow
              icon={<Layers size={18} className="text-violet-500" />}
              label="Collections"
              value={boardCount === null ? '…' : String(boardCount)}
            />
          </div>
        </section>

        {/* Export section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Backup</h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Database size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Download all my data</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Exports all your clips, collections, and saved trips as a JSON file.
                    Includes extracted locations, tips, and substance — everything TravelPanel knows.
                  </p>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exportState === 'loading'}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  exportState === 'done'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : exportState === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                } disabled:opacity-60`}
              >
                {exportState === 'loading' && (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing export…
                  </>
                )}
                {exportState === 'done' && (
                  <>
                    <CheckCircle2 size={16} />
                    Downloaded!
                  </>
                )}
                {exportState === 'error' && (
                  <>
                    <AlertCircle size={16} />
                    Export failed — try again
                  </>
                )}
                {exportState === 'idle' && (
                  <>
                    <Download size={16} />
                    Export as JSON
                  </>
                )}
              </button>
            </div>

            {/* Format note */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                The export contains your clips, substance items (tips, warnings, wisdom), board memberships, and saved trip itineraries.
                Demo seed data is excluded. Keep this file as a backup before clearing your device.
              </p>
            </div>
          </div>
        </section>

        {/* About section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">About</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            <InfoRow label="Version" value="1.0.0 (Phase A)" />
            <InfoRow label="Storage" value="Local — IndexedDB" />
            <InfoRow label="AI extraction" value="Claude Haiku · Anthropic" />
            <InfoRow label="Maps" value="MapLibre · OpenFreeMap" />
          </div>
        </section>
      </div>

      <NavBar active="settings" />
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon}
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-3.5 gap-3">
      <span className="flex-1 text-sm text-gray-600">{label}</span>
      <span className="text-xs text-gray-400 font-medium">{value}</span>
    </div>
  );
}
