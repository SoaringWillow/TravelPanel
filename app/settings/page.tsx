'use client';

import { useState, useEffect } from 'react';
import { Download, CloudOff, Trash2, ChevronRight, CheckCircle2, Moon, Sun, Monitor, Cloud, User } from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import NavBar from '@/components/NavBar';
import { useTheme, ThemeMode } from '@/components/ThemeProvider';
import { cloudEnabled, getSession, onAuthChange } from '@/lib/supabase';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';
import { requestNotificationPermission, isNotificationPermissionGranted, scheduleWeeklyReminder, cancelReminders } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';

// ─── Data export ──────────────────────────────────────────────────────────────

async function buildExportPayload() {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      items: items.length,
      boards: boards.length,
      trips: trips.length,
    },
    items,
    boards,
    trips,
  };
}

function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-6 pb-2">
      <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onClick,
  variant = 'default',
  loading = false,
  done = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  loading?: boolean;
  done?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || done}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
        variant === 'danger' ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'
      } disabled:opacity-60`}
    >
      <span className={`flex-shrink-0 ${variant === 'danger' ? 'text-red-400' : 'text-indigo-500'}`}>
        {done ? <CheckCircle2 size={20} className="text-green-500" /> : icon}
      </span>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{done ? 'Downloaded!' : label}</div>
        {sublabel && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</div>}
      </div>
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
      ) : (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── Theme toggle ──────────────────────────────────────────────────────────────

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'System',  icon: <Monitor size={16} /> },
  { value: 'light',  label: 'Light',   icon: <Sun size={16} /> },
  { value: 'dark',   label: 'Dark',    icon: <Moon size={16} /> },
];

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {THEME_OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            mode === value
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [exportError, setExportError] = useState('');
  const [cloudSession, setCloudSession] = useState<Session | null>(null);
  const [analyticsConsent, setAnalyticsConsentState] = useState<'yes' | 'no' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAnalyticsConsentState(getAnalyticsConsent());
    isNotificationPermissionGranted().then(setNotificationsEnabled);
  }, []);

  async function handleNotificationToggle() {
    if (notificationsEnabled) {
      await cancelReminders();
      setNotificationsEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleWeeklyReminder();
        setNotificationsEnabled(true);
      }
    }
  }

  useEffect(() => {
    if (!cloudEnabled) return;
    getSession().then(setCloudSession);
    let unsub = () => {};
    onAuthChange(setCloudSession).then((fn) => { unsub = fn; });
    return () => unsub();
  }, []);

  async function handleExportJSON() {
    setExportState('loading');
    setExportError('');
    try {
      const data = await buildExportPayload();
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `travelpanel-backup-${date}.json`);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('idle');
      setExportError('Export failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">App preferences and account options</p>
      </div>

      {/* Appearance section */}
      <SectionHeader title="Appearance" />
      <div className="mx-4">
        <ThemeToggle />
      </div>

      {/* Privacy section */}
      <SectionHeader title="Privacy & Notifications" />
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
        {/* Weekly reminder toggle */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            🔔
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Weekly planning reminder</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Monday 9am nudge to plan your saved places</div>
          </div>
          <button
            type="button"
            onClick={handleNotificationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            📊
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Share usage analytics</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Anonymous data to improve the app. No personal info or location.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = analyticsConsent === 'yes' ? 'no' : 'yes';
              setAnalyticsConsent(next);
              setAnalyticsConsentState(next);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              analyticsConsent === 'yes' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              analyticsConsent === 'yes' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Data section */}
      <SectionHeader
        title="Data & Backup"
        subtitle="Your clips live on-device. Export to keep a copy."
      />
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <SettingsRow
          icon={<Download size={20} />}
          label="Download my data"
          sublabel="All clips, boards, and trip plans as JSON"
          onClick={handleExportJSON}
          loading={exportState === 'loading'}
          done={exportState === 'done'}
        />
      </div>
      {exportError && (
        <p className="text-xs text-red-500 px-5 mt-2">{exportError}</p>
      )}

      {/* Cloud section */}
      <SectionHeader
        title="Account & Cloud Sync"
        subtitle={cloudEnabled ? 'Sync your clips across devices' : undefined}
      />
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <SettingsRow
          icon={cloudEnabled ? (cloudSession ? <User size={20} /> : <Cloud size={20} />) : <CloudOff size={20} />}
          label={cloudSession ? 'Signed in' : cloudEnabled ? 'Sign in to sync' : 'Cloud sync'}
          sublabel={
            cloudSession
              ? cloudSession.user.email ?? 'Manage account'
              : cloudEnabled
              ? 'Back up and sync across devices'
              : 'Add Supabase keys to enable'
          }
          onClick={() => router.push('/account')}
        />
      </div>

      {/* Danger zone */}
      <SectionHeader title="Danger Zone" />
      <div className="mx-4 rounded-2xl overflow-hidden border border-red-100 dark:border-red-900/40 bg-white dark:bg-gray-900 shadow-sm">
        <SettingsRow
          icon={<Trash2 size={20} />}
          label="Clear all data"
          sublabel="Permanently delete all clips, boards, and plans"
          onClick={() => {
            if (window.confirm('Delete ALL your TravelPanel data? This cannot be undone.')) {
              indexedDB.deleteDatabase('travel-panel');
              window.location.reload();
            }
          }}
          variant="danger"
        />
      </div>

      {/* Version footer */}
      <div className="px-4 pt-8 pb-4 text-center">
        <p className="text-xs text-gray-300 dark:text-gray-600">TravelPanel v0.1.0</p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
