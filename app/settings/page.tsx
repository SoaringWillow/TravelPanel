'use client';

import { useState } from 'react';
import { Download, Database, ExternalLink, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';

// ─── Types ─────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'done' | 'error';

interface ExportStats {
  clips: number;
  boards: number;
  trips: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function exportAllData(): Promise<ExportStats> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    counts: { clips: items.length, boards: boards.length, trips: trips.length },
    clips: items,
    boards,
    trips,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { clips: items.length, boards: boards.length, trips: trips.length };
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleExport() {
    setExportState('loading');
    setErrorMsg('');
    try {
      const stats = await exportAllData();
      setExportStats(stats);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed');
      setExportState('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Data & Backup section ───────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Data &amp; Backup
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

            {/* Export row */}
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Download size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Export all data</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Download a JSON file of all your clips, boards, and trip plans.
                    Import it back any time to restore your data.
                  </p>

                  {exportState === 'done' && exportStats && (
                    <p className="text-xs text-green-600 font-medium mt-2">
                      ✓ Downloaded — {exportStats.clips} clips, {exportStats.boards} boards,{' '}
                      {exportStats.trips} trips
                    </p>
                  )}
                  {exportState === 'error' && (
                    <p className="text-xs text-red-500 mt-2">{errorMsg || 'Export failed. Try again.'}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exportState === 'loading'}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportState === 'loading' ? (
                      <>
                        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        Preparing…
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        Download backup
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Storage info row */}
            <StorageInfoRow />
          </div>
        </section>

        {/* ── About section ──────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Storage" value="Local (IndexedDB)" />
            <LinkRow
              label="Browser Extension"
              description="Clip pages from Chrome or Safari"
              href="/extension"
            />
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StorageInfoRow() {
  const [info, setInfo] = useState<{ clips: number; boards: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    setLoaded(true);
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      setInfo({ clips: items.length, boards: boards.length });
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      onClick={load}
    >
      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Database size={18} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Local storage</p>
        {info ? (
          <p className="text-xs text-gray-500 mt-0.5">
            {info.clips} clips · {info.boards} boards
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Tap to check</p>
        )}
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm text-gray-500">{value}</span>
    </div>
  );
}

function LinkRow({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <ExternalLink size={16} className="text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </a>
  );
}
