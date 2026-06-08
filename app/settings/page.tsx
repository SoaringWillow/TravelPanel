'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, Info, Database, BookOpen, Map } from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExportPayload {
  version: string;
  exportedAt: string;
  stats: { clips: number; boards: number; trips: number };
  clips: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportAllData(): Promise<void> {
  const [clips, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  // Fetch trips for every board in parallel
  const allTrips = (
    await Promise.all(boards.map((b) => getTripsForBoard(b.id)))
  ).flat();

  const payload: ExportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: { clips: clips.length, boards: boards.length, trips: allTrips.length },
    clips,
    boards,
    trips: allTrips,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]       = useState({ clips: 0, boards: 0, trips: 0 });
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    async function loadStats() {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const trips = (await Promise.all(boards.map((b) => getTripsForBoard(b.id)))).flat();
      setStats({ clips: items.length, boards: boards.length, trips: trips.length });
    }
    loadStats().catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportDone(false);
    try {
      await exportAllData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch {
      // Silently fail — browser download API unavailable
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Data summary */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Data</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <StatTile icon={<Database size={18} className="text-indigo-500" />} value={stats.clips}  label="Clips" />
            <StatTile icon={<BookOpen  size={18} className="text-purple-500" />} value={stats.boards} label="Boards" />
            <StatTile icon={<Map       size={18} className="text-emerald-500" />} value={stats.trips}  label="Plans" />
          </div>
        </section>

        {/* Backup & export */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Backup</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 mb-4">
              Download all your clips, boards, and trip plans as a JSON file. Use this to back up your data or migrate to a new device.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                exportDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Download size={17} />
              {exporting ? 'Preparing download…' : exportDone ? 'Downloaded!' : 'Export all data'}
            </button>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Exports {stats.clips} clip{stats.clips !== 1 ? 's' : ''},{' '}
              {stats.boards} board{stats.boards !== 1 ? 's' : ''},{' '}
              {stats.trips} trip plan{stats.trips !== 1 ? 's' : ''}
            </p>
          </div>
        </section>

        {/* About */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">About</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <AboutRow label="App" value="TravelPanel" />
            <AboutRow label="Version" value="1.0.0" />
            <AboutRow label="AI" value="Claude (Anthropic)" />
            <AboutRow label="Maps" value="MapLibre + OpenFreeMap" />
            <div className="flex items-start gap-2.5 py-2">
              <Info size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Your data is stored locally on this device. Cloud sync (Supabase) will be available in a future update.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center py-5 gap-1.5">
      {icon}
      <span className="text-2xl font-bold text-gray-900 tabular-nums">{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
