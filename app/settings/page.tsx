'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Trash2, Info, Database, Moon, Sun, Monitor } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, importFromJSON } from '@/lib/backup';
import { clearDemoContent } from '@/lib/demoData';

interface Stats {
  clips: number;
  boards: number;
  trips: number;
  locations: number;
  substanceItems: number;
}

type AsyncState = 'idle' | 'working' | 'done' | 'error';
type ThemeMode = 'system' | 'dark' | 'light';

const THEME_KEY = 'tp_theme_override';

function getTheme(): ThemeMode {
  try { return (localStorage.getItem(THEME_KEY) as ThemeMode) ?? 'system'; } catch { return 'system'; }
}

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement;
  if (mode === 'dark') { html.classList.add('dark'); }
  else if (mode === 'light') { html.classList.remove('dark'); }
  else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', prefersDark);
  }
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
}

export default function SettingsPage() {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<AsyncState>('idle');
  const [importState, setImportState] = useState<AsyncState>('idle');
  const [importMsg, setImportMsg]     = useState('');
  const [demoState, setDemoState]     = useState<AsyncState>('idle');
  const [theme, setTheme]             = useState<ThemeMode>('system');
  const [hasDemoContent, setHasDemoContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme(getTheme());
    const load = async () => {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);
      setStats({
        clips:          items.filter((i) => !i.isDemo).length,
        boards:         boards.filter((b) => !b.isDemo).length,
        trips:          trips.length,
        locations:      items.reduce((s, i) => s + (i.locations?.length ?? 0), 0),
        substanceItems: items.reduce((s, i) => s + (i.substance?.length ?? 0), 0),
      });
      setHasDemoContent(items.some((i) => i.isDemo) || boards.some((b) => b.isDemo));
    };
    load().catch(() => {});
  }, []);

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode);
    applyTheme(mode);
  }

  async function handleExport() {
    setExportState('working');
    try {
      await exportAllData();
      setExportState('done');
    } catch {
      setExportState('error');
    }
    setTimeout(() => setExportState('idle'), 3000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState('working');
    setImportMsg('');
    try {
      const { imported, skipped } = await importFromJSON(file);
      setImportMsg(`Imported ${imported} clip${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}.`);
      setImportState('done');
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed');
      setImportState('error');
    }
    e.target.value = '';
    setTimeout(() => { setImportState('idle'); setImportMsg(''); }, 4000);
  }

  async function handleClearDemo() {
    setDemoState('working');
    try {
      await clearDemoContent();
      setHasDemoContent(false);
      setDemoState('done');
    } catch {
      setDemoState('error');
    }
    setTimeout(() => setDemoState('idle'), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Stats */}
        {stats && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <SectionHeader icon={<Database size={15} className="text-indigo-500" />} title="Your Library" />
            <div className="grid grid-cols-3 divide-x divide-gray-50 dark:divide-white/10">
              <StatCell label="Clips" value={stats.clips} icon="📎" />
              <StatCell label="Boards" value={stats.boards} icon="🗂" />
              <StatCell label="Plans" value={stats.trips} icon="🗺" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-50 dark:divide-white/10 border-t border-gray-50 dark:border-white/10">
              <StatCell label="Locations" value={stats.locations} icon="📍" />
              <StatCell label="Tips saved" value={stats.substanceItems} icon="💡" />
            </div>
          </div>
        )}

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          <SectionHeader icon={<Sun size={15} className="text-indigo-500" />} title="Appearance" />
          <div className="px-4 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Dark mode</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'system', label: 'System', icon: <Monitor size={14} /> },
                { key: 'light',  label: 'Light',  icon: <Sun size={14} /> },
                { key: 'dark',   label: 'Dark',   icon: <Moon size={14} /> },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleThemeChange(key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all text-xs font-medium ${
                    theme === key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-indigo-300'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          <SectionHeader icon={<Download size={15} className="text-indigo-500" />} title="Backup & Restore" />
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Export all clips, boards, and trip plans as JSON. Import a previous backup to restore or merge.
            </p>

            <button
              onClick={handleExport}
              disabled={exportState === 'working'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                exportState === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : exportState === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60'
              }`}
            >
              <Download size={15} />
              {exportState === 'working' ? 'Preparing…' : exportState === 'done' ? 'Downloaded ✓' : exportState === 'error' ? 'Export failed' : 'Export backup'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'working'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
                importState === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : importState === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300 active:scale-[0.98] disabled:opacity-60'
              }`}
            >
              <Upload size={15} />
              {importState === 'working' ? 'Importing…' : importState === 'done' ? 'Imported ✓' : importState === 'error' ? 'Import failed' : 'Import backup'}
            </button>
            {importMsg && (
              <p className={`text-xs text-center ${importState === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                {importMsg}
              </p>
            )}
          </div>
        </div>

        {/* Demo content */}
        {hasDemoContent && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <SectionHeader icon={<Trash2 size={15} className="text-amber-500" />} title="Demo Content" />
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Remove the sample clips and demo board that were created during onboarding.
              </p>
              <button
                onClick={handleClearDemo}
                disabled={demoState === 'working'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-amber-200 text-amber-700 hover:bg-amber-50 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Trash2 size={15} />
                {demoState === 'working' ? 'Clearing…' : demoState === 'done' ? 'Done ✓' : 'Clear demo content'}
              </button>
            </div>
          </div>
        )}

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          <SectionHeader icon={<Info size={15} className="text-indigo-500" />} title="About" />
          <div className="px-4 py-4 space-y-2">
            <AboutRow label="App" value="TravelPanel" />
            <AboutRow label="Version" value="0.1.0" />
            <AboutRow label="Storage" value="Local (IndexedDB)" />
            <AboutRow label="AI" value="Claude (Anthropic)" />
            <AboutRow label="Feedback" value={<a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 dark:text-indigo-400 underline">Send email</a>} />
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-white/10">
      {icon}
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
    </div>
  );
}

function StatCell({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex flex-col items-center py-4 gap-0.5">
      <span className="text-lg">{icon}</span>
      <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}
