'use client';

import { useState, useEffect } from 'react';
import { Download, Database, Map, BookOpen, Route, Plane, X } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { buildExport, downloadJSON } from '@/lib/exportData';
import { getUpcomingTrip, setUpcomingTrip, UpcomingTrip } from '@/lib/resurfacing';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [tripDest, setTripDest] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripSaved, setTripSaved] = useState(false);

  useEffect(() => {
    const t = getUpcomingTrip();
    if (t) { setTripDest(t.destination); setTripDate(t.departureDate); }
  }, []);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
  }, []);

  function handleSaveTrip() {
    if (tripDest && tripDate) {
      setUpcomingTrip({ destination: tripDest, departureDate: tripDate });
    } else {
      setUpcomingTrip(null);
    }
    setTripSaved(true);
    setTimeout(() => setTripSaved(false), 2000);
  }

  function handleClearTrip() {
    setUpcomingTrip(null);
    setTripDest('');
    setTripDate('');
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await buildExport();
      downloadJSON(data);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">

        {/* Stats card */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Your Data
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
            <StatRow
              icon={<Map size={16} className="text-indigo-500" />}
              label="Saved clips"
              value={stats?.items ?? '—'}
            />
            <StatRow
              icon={<BookOpen size={16} className="text-emerald-500" />}
              label="Collections"
              value={stats?.boards ?? '—'}
            />
            <StatRow
              icon={<Route size={16} className="text-amber-500" />}
              label="Trip plans"
              value={stats?.trips ?? '—'}
            />
          </div>
        </section>

        {/* Upcoming trip section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Upcoming Trip
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Plane size={15} className="text-indigo-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Get a reminder when your trip is within 14 days</span>
            </div>
            <input
              type="text"
              placeholder="Destination (e.g. Tokyo)"
              value={tripDest}
              onChange={(e) => setTripDest(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveTrip}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tripSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {tripSaved ? '✓ Saved!' : 'Save trip'}
              </button>
              {(tripDest || tripDate) && (
                <button
                  onClick={handleClearTrip}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center gap-1"
                >
                  <X size={13} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Backup section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Backup
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Download all my data</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Exports all clips, boards, and trip plans as a JSON file.
                    Includes all substance tips and location data.
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all
                  ${exported
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                  } ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing…
                  </>
                ) : exported ? (
                  <>✓ Downloaded!</>
                ) : (
                  <>
                    <Download size={16} />
                    Export backup
                  </>
                )}
              </button>

              {stats && (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {stats.items} clips · {stats.boards} boards · {stats.trips} plans
                </p>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
            <AboutRow label="App" value="TravelPanel" />
            <AboutRow label="Version" value="1.0.0" />
            <AboutRow label="Storage" value="On-device (IndexedDB)" />
            <AboutRow label="AI" value="Claude (Anthropic)" />
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
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
        {icon}
      </div>
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
