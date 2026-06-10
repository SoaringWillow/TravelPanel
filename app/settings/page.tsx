'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, CheckCircle2, AlertTriangle, Map, Inbox, LayoutGrid, FileJson } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]       = useState({ items: 0, boards: 0 });
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setStats({ items: items.length, boards: boards.length });
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportError('');
    setExportDone(false);
    try {
      const { buildBackup, downloadBackup } = await import('@/lib/exportBackup');
      const data = await buildBackup();
      downloadBackup(data);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e) {
      setExportError('Export failed — try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-status pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your data, your device.</p>
      </div>

      <div className="px-5 py-6 space-y-6">

        {/* ── Stats ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Your library
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Map}        label="Saved clips"  value={stats.items}  color="bg-indigo-500" />
            <StatCard icon={LayoutGrid} label="Collections"  value={stats.boards} color="bg-sky-500"    />
          </div>
        </section>

        {/* ── Backup ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Data backup
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileJson size={20} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Download all my data</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                    Exports all clips, boards, and trip plans as a JSON file.
                    Keep a copy on your device or iCloud Drive.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-4">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  exportDone
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60'
                }`}
              >
                {exportDone ? (
                  <>
                    <CheckCircle2 size={17} />
                    Downloaded!
                  </>
                ) : exporting ? (
                  <span className="animate-pulse">Preparing export…</span>
                ) : (
                  <>
                    <Download size={17} />
                    Download backup (.json)
                  </>
                )}
              </button>

              {exportError && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {exportError}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-2 text-center">
                {stats.items} clip{stats.items !== 1 ? 's' : ''} ·{' '}
                {stats.boards} board{stats.boards !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </section>

        {/* ── Danger zone ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Danger zone
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-600 transition-colors py-1"
                >
                  <Trash2 size={16} />
                  Clear all local data…
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                    <AlertTriangle size={15} />
                    This will permanently delete all clips, boards, and trips from this device.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          indexedDB.deleteDatabase('travel-panel');
                          localStorage.clear();
                          window.location.href = '/';
                        } catch {
                          setConfirmClear(false);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Delete everything
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-2.5 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>App</span>
              <span className="font-medium text-gray-900">TravelPanel</span>
            </div>
            <div className="flex justify-between">
              <span>Data stored</span>
              <span className="font-medium text-gray-900">On device (IndexedDB)</span>
            </div>
            <div className="flex justify-between">
              <span>Cloud sync</span>
              <span className="text-amber-600 font-medium">Coming soon</span>
            </div>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
