'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Download, Trash2, ChevronRight, Database, Shield, Info, Palette, Sun, Moon, Monitor } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJSON } from '@/lib/exportData';

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton() {
  type ExportState = 'idle' | 'loading' | 'done' | 'error';
  const [state, setState] = useState<ExportState>('idle');
  const [counts, setCounts] = useState<{ items: number; boards: number } | null>(null);

  async function handleExport() {
    setState('loading');
    try {
      const data = await exportAllData();
      downloadJSON(data);
      setCounts({ items: data.items.length, boards: data.boards.length });
      setState('done');
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  if (state === 'loading') {
    return (
      <button disabled className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl opacity-60">
        <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <span className="animate-spin text-lg">⏳</span>
          Preparing export…
        </span>
      </button>
    );
  }

  if (state === 'done') {
    return (
      <div className="w-full flex items-center justify-between py-3 px-4 bg-green-50 rounded-xl">
        <span className="flex items-center gap-3 text-sm font-medium text-green-700">
          <span className="text-lg">✅</span>
          <span>
            Downloaded!
            {counts && (
              <span className="font-normal text-green-600 ml-1">
                ({counts.items} clips, {counts.boards} boards)
              </span>
            )}
          </span>
        </span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full flex items-center gap-3 py-3 px-4 bg-red-50 rounded-xl">
        <span className="text-lg">❌</span>
        <span className="text-sm font-medium text-red-700">Export failed. Try again.</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleExport}
      className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
        <Download size={17} className="text-indigo-600" />
        Download all data (JSON)
      </span>
      <ChevronRight size={15} className="text-gray-400" />
    </button>
  );
}

// ─── Clear data button ────────────────────────────────────────────────────────

function ClearDataButton() {
  const [confirming, setConfirming] = useState(false);

  async function handleClear() {
    try {
      // Delete the IndexedDB entirely and reload
      const req = indexedDB.deleteDatabase('travel-panel');
      req.onsuccess = () => {
        localStorage.clear();
        window.location.href = '/';
      };
    } catch {
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-600 font-medium px-1">
          This permanently deletes all clips, boards, and trip plans. There is no undo.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Delete everything
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full flex items-center justify-between py-3 px-4 bg-red-50 rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-red-700">
        <Trash2 size={17} className="text-red-600" />
        Clear all data
      </span>
      <ChevronRight size={15} className="text-red-400" />
    </button>
  );
}

// ─── Appearance toggle ────────────────────────────────────────────────────────

function AppearanceToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ];
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Appearance</span>
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              theme === value
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            aria-label={`${label} mode`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Settings row helper ──────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h2>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-safe-top">
        <div className="max-w-lg mx-auto py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Appearance section */}
        <Section icon={<Palette size={14} />} title="Appearance">
          <AppearanceToggle />
        </Section>

        {/* Data section */}
        <Section icon={<Database size={14} />} title="Data">
          <ExportButton />
          <p className="text-xs text-gray-400 px-1">
            Exports all clips, boards, and trip plans as a JSON file. Use it to back up your data or migrate to another device.
          </p>
          <div className="pt-1">
            <ClearDataButton />
          </div>
        </Section>

        {/* Account section — placeholder for Supabase auth (Phase B) */}
        <Section icon={<Shield size={14} />} title="Account">
          <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Cloud sync</p>
              <p className="text-xs text-gray-400 mt-0.5">Sign in to sync across devices</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full">
              Coming soon
            </span>
          </div>
        </Section>

        {/* About section */}
        <Section icon={<Info size={14} />} title="About">
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center justify-between py-3 px-4">
              <span className="text-sm text-gray-700">Version</span>
              <span className="text-sm text-gray-500">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4">
              <span className="text-sm text-gray-700">AI model</span>
              <span className="text-sm text-gray-500">Claude Haiku</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4">
              <span className="text-sm text-gray-700">Maps</span>
              <span className="text-sm text-gray-500">OpenFreeMap</span>
            </div>
          </div>
        </Section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
