'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Info, Database, Moon, Bell } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getTripsForBoard, deleteDemoData } from '@/lib/db';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { requestNotificationPermission } from '@/lib/pushNotifications';
import { isPro, deactivatePro } from '@/lib/pro';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  items: number;
  boards: number;
  trips: number;
  demoItems: number;
  demoBoards: number;
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const [demoState, setDemoState] = useState<'idle' | 'deleting' | 'done'>('idle');
  const [demoRemoved, setDemoRemoved] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const allTrips = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      const trips = allTrips.flat();
      setStats({
        items: items.length,
        boards: boards.length,
        trips: trips.length,
        demoItems: items.filter((i) => i.isDemo).length,
        demoBoards: boards.filter((b) => b.isDemo).length,
      });
    } catch {
      setStats({ items: 0, boards: 0, trips: 0, demoItems: 0, demoBoards: 0 });
    }
  }

  async function handleExport() {
    setExportState('exporting');
    try {
      const { downloadBackup } = await import('@/lib/exportBackup');
      await downloadBackup();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleDeleteDemo() {
    setDemoState('deleting');
    try {
      const removed = await deleteDemoData();
      setDemoRemoved(removed);
      setDemoState('done');
      await loadStats();
    } catch {
      setDemoState('idle');
    }
  }

  const { preference: themePreference, setPreference: setTheme } = useTheme();
  const [proStatus, setProStatus] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission);
    setProStatus(isPro());
  }, []);
  const hasDemoData = (stats?.demoItems ?? 0) + (stats?.demoBoards ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Data summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Database size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your data</span>
          </div>
          {stats ? (
            <div className="divide-y divide-gray-50">
              <StatRow label="Saved clips" value={stats.items} />
              <StatRow label="Collections" value={stats.boards} />
              <StatRow label="Trip plans" value={stats.trips} />
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Pro tier status */}
        <div className={`rounded-2xl border overflow-hidden ${proStatus ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg">✨</span>
                <span className="font-bold text-gray-900">{proStatus ? 'TravelPanel Pro' : 'Free Plan'}</span>
                {proStatus && <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <p className="text-xs text-gray-500">
                {proStatus ? 'Unlimited plans · unlimited enrichments' : '3 plans/day · 20 enrichments/hour'}
              </p>
            </div>
            {proStatus ? (
              <button
                type="button"
                onClick={() => { deactivatePro(); setProStatus(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Deactivate
              </button>
            ) : null}
          </div>
        </div>

        {/* Export section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Download size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Backup</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-600">
              Download all your clips, collections, and trip plans as a JSON file.
              Use this to back up your data or transfer it later.
            </p>
            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3 px-4 rounded-xl hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
            >
              {exportState === 'exporting' ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting…</>
              ) : exportState === 'done' ? (
                <>✅ Download started</>
              ) : exportState === 'error' ? (
                <>⚠️ Export failed — try again</>
              ) : (
                <><Download size={15} />Download backup</>
              )}
            </button>
            <p className="text-xs text-gray-400">
              File contains: clips, collections, trips · Format: JSON · Stored locally on your device
            </p>
          </div>
        </div>

        {/* Demo data section (only when demo content exists) */}
        {hasDemoData && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <Trash2 size={15} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Demo content</span>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Your account has {stats!.demoItems} example clip{stats!.demoItems !== 1 ? 's' : ''} and{' '}
                {stats!.demoBoards} example collection{stats!.demoBoards !== 1 ? 's' : ''} from onboarding.
                Remove them to start fresh.
              </p>
              {demoState === 'done' ? (
                <p className="text-sm text-green-600 font-medium">✅ Removed {demoRemoved} demo item{demoRemoved !== 1 ? 's' : ''}</p>
              ) : (
                <button
                  onClick={handleDeleteDemo}
                  disabled={demoState === 'deleting'}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold text-sm py-3 px-4 rounded-xl hover:bg-red-50 active:scale-98 transition-all disabled:opacity-50"
                >
                  {demoState === 'deleting' ? (
                    <><span className="inline-block w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />Removing…</>
                  ) : (
                    <><Trash2 size={15} />Remove demo content</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Appearance section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
            <Moon size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Appearance</span>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as ThemePreference[]).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setTheme(pref)}
                  className={`py-2.5 rounded-xl text-sm font-medium capitalize border transition-all ${
                    themePreference === pref
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {pref === 'system' ? 'System' : pref === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
            <Bell size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notifications</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get nudged when you have 3+ clips in the same destination for 7+ days.
            </p>
            {notifPermission === 'granted' ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Bell size={14} />
                Notifications enabled
              </div>
            ) : notifPermission === 'denied' ? (
              <p className="text-sm text-red-500">Notifications blocked — enable in browser settings.</p>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotifPermission(granted ? 'granted' : 'denied');
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Bell size={14} />
                Enable notifications
              </button>
            )}
          </div>
        </div>

        {/* About section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Info size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About</span>
          </div>
          <div className="divide-y divide-gray-50">
            <InfoRow label="App" value="TravelPanel" />
            <InfoRow label="Storage" value="On-device (IndexedDB)" />
            <InfoRow label="AI" value="Claude (Anthropic)" />
            <InfoRow label="Maps" value="OpenFreeMap + MapLibre" />
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
