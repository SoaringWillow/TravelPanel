'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Database, Wifi, WifiOff, Check, AlertCircle, Sun, Moon, Monitor } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';
import { useDarkMode } from '@/hooks/useDarkMode';

// ── Export ────────────────────────────────────────────────────────────────────

async function buildExportPayload() {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  // Fetch trips for all boards
  const { getTripsForBoard } = await import('@/lib/db');
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

function triggerDownload(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]         = useState<{ items: number; boards: number } | null>(null);
  const [exportState, setExport]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const { scheme, setScheme }     = useDarkMode();

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()])
      .then(([items, boards]) => setStats({ items: items.length, boards: boards.length }))
      .catch(() => setStats({ items: 0, boards: 0 }));
  }, []);

  async function handleExport() {
    setExport('loading');
    try {
      const payload  = await buildExportPayload();
      const datestamp = new Date().toISOString().slice(0, 10);
      triggerDownload(payload, `travelpanel-backup-${datestamp}.json`);
      setExport('done');
      setTimeout(() => setExport('idle'), 3000);
    } catch {
      setExport('error');
      setTimeout(() => setExport('idle'), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Data, backups, and account</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <Section title="Appearance" icon={<Sun size={18} className="text-amber-500" />}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Choose how TravelPanel looks on this device.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'light', label: 'Light',  Icon: Sun },
              { value: 'auto',  label: 'Auto',   Icon: Monitor },
              { value: 'dark',  label: 'Dark',   Icon: Moon },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setScheme(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  scheme === value
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Data export card ─────────────────────────────────────────────── */}
        <Section title="Your Data" icon={<Database size={18} className="text-indigo-500" />}>

          {/* Stats */}
          {stats && (
            <div className="flex gap-6 mb-4">
              <StatChip label="Clips" value={stats.items} />
              <StatChip label="Collections" value={stats.boards} />
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Download a complete backup of all your clips, collections, and trip plans as JSON.
            Useful before reinstalling, switching devices, or migrating to cloud sync.
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={exportState === 'loading'}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              exportState === 'done'
                ? 'bg-green-50 text-green-700 border-2 border-green-200'
                : exportState === 'error'
                ? 'bg-red-50 text-red-700 border-2 border-red-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            } disabled:opacity-60`}
          >
            {exportState === 'loading' && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {exportState === 'done' && <Check size={16} />}
            {exportState === 'error' && <AlertCircle size={16} />}
            {exportState === 'idle' && <Download size={16} />}
            {exportState === 'loading' ? 'Preparing…'
              : exportState === 'done'  ? 'Downloaded!'
              : exportState === 'error' ? 'Export failed — try again'
              : 'Download all my data (.json)'}
          </motion.button>
        </Section>

        {/* ── Cloud sync placeholder ───────────────────────────────────────── */}
        <Section title="Cloud Sync" icon={<WifiOff size={18} className="text-gray-400" />}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Wifi size={32} className="text-gray-200" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Sync not set up</p>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                Cloud sync keeps your clips safe and available across devices.
                Coming in a future update — your data is stored locally until then.
              </p>
            </div>
          </div>
        </Section>

        {/* ── App info ─────────────────────────────────────────────────────── */}
        <Section title="About">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Storage" value="Local (IndexedDB)" />
          <InfoRow label="AI" value="Claude (Anthropic)" />
        </Section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-gray-50 dark:border-gray-800">
        {icon}
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-700">{value}</span>
    </div>
  );
}
