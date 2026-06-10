'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle2, Database, Map, Compass, LayoutGrid, Info } from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import NavBar from '@/components/NavBar';
import { SavedItem, Board, Trip } from '@/lib/types';

interface BackupStats {
  itemCount: number;
  boardCount: number;
  tripCount: number;
}

export default function SettingsPage() {
  const [stats, setStats]           = useState<BackupStats | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);

  useEffect(() => {
    async function loadStats() {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const tripCounts = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      const tripCount  = tripCounts.reduce((sum, t) => sum + t.length, 0);
      setStats({ itemCount: items.length, boardCount: boards.length, tripCount });
    }
    loadStats().catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const allTrips: Trip[] = [];
      for (const board of boards) {
        const trips = await getTripsForBoard(board.id);
        allTrips.push(...trips);
      }

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        app: 'TravelPanel',
        items,
        boards,
        trips: allTrips,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);

      const a = document.createElement('a');
      a.href     = url;
      a.download = `travelpanel-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {
      // Download failed silently — user can retry
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Stats card */}
        {stats && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Database size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700">Your data</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatPill icon={Map} label="Clips" value={stats.itemCount} color="indigo" />
              <StatPill icon={LayoutGrid} label="Boards" value={stats.boardCount} color="violet" />
              <StatPill icon={Compass} label="Plans" value={stats.tripCount} color="purple" />
            </div>
          </div>
        )}

        {/* Export section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Download size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Backup &amp; Export</span>
          </div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Download all your clips, boards, and trip plans as a JSON file.
            Use it to back up your data or move to another device.
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {exported ? (
              <>
                <CheckCircle2 size={16} />
                Downloaded!
              </>
            ) : exporting ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Preparing…
              </>
            ) : (
              <>
                <Download size={16} />
                Download all my data
              </>
            )}
          </button>

          {stats && (
            <p className="text-center text-xs text-gray-400 mt-2">
              {stats.itemCount} clips · {stats.boardCount} boards · {stats.tripCount} plans
            </p>
          )}
        </div>

        {/* Cloud sync teaser */}
        <div className="bg-indigo-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700">Cloud sync coming soon</span>
          </div>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Automatic backup to the cloud — so your clips are safe across devices
            and never lost if you reinstall. Available in the next update.
          </p>
        </div>

      </div>

      <NavBar active="settings" />
    </main>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'indigo' | 'violet' | 'purple';
}) {
  const bg  = { indigo: 'bg-indigo-50',  violet: 'bg-violet-50',  purple: 'bg-purple-50'  }[color];
  const txt = { indigo: 'text-indigo-600', violet: 'text-violet-600', purple: 'text-purple-600' }[color];
  return (
    <div className={`${bg} rounded-xl p-3 flex flex-col items-center gap-1`}>
      <Icon size={16} className={txt} />
      <span className={`text-lg font-bold ${txt}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
