'use client';

import { useState } from 'react';
import { Download, CloudOff, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import NavBar from '@/components/NavBar';

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
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white active:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
        variant === 'danger' ? 'text-red-600' : 'text-gray-800'
      } disabled:opacity-60`}
    >
      <span className={`flex-shrink-0 ${variant === 'danger' ? 'text-red-400' : 'text-indigo-500'}`}>
        {done ? <CheckCircle2 size={20} className="text-green-500" /> : icon}
      </span>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{done ? 'Downloaded!' : label}</div>
        {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
      </div>
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
      ) : (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [exportError, setExportError] = useState('');

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
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">App preferences and account options</p>
      </div>

      {/* Data section */}
      <SectionHeader
        title="Data & Backup"
        subtitle="Your clips live on-device. Export to keep a copy."
      />
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
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
        title="Cloud Sync"
        subtitle="Sign in to sync your clips across devices. Coming soon."
      />
      <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <SettingsRow
          icon={<CloudOff size={20} />}
          label="Cloud sync"
          sublabel="Currently stored on-device only"
          onClick={() => {}}
        />
      </div>

      {/* Danger zone */}
      <SectionHeader title="Danger Zone" />
      <div className="mx-4 rounded-2xl overflow-hidden border border-red-100 bg-white shadow-sm">
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
        <p className="text-xs text-gray-300">TravelPanel v0.1.0</p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
