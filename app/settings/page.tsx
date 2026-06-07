'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download, Trash2, ChevronRight, Cloud, Database, Info } from 'lucide-react';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { exportAllData, downloadBackup } from '@/lib/exportData';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

// ─── Row components ───────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onClick,
  href,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        disabled ? 'opacity-40' : danger ? 'cursor-pointer active:bg-red-50' : onClick || href ? 'cursor-pointer active:bg-gray-50' : ''
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <span className={`flex-shrink-0 ${danger ? 'text-red-500' : 'text-gray-500'}`}>{icon}</span>
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-900'}`}>
        {label}
      </span>
      {value && <span className="text-sm text-gray-400">{value}</span>}
      {(onClick || href) && !disabled && (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-2">
        {title}
      </p>
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 mx-0 shadow-sm border border-gray-100">
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [clearState, setClearState] = useState<'idle' | 'confirm' | 'clearing'>('idle');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const backup = await exportAllData();
      downloadBackup(backup);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('idle');
    }
  }

  async function handleClearAll() {
    if (clearState === 'idle') { setClearState('confirm'); return; }
    if (clearState !== 'confirm') return;

    setClearState('clearing');
    try {
      // Clear all IndexedDB data by deleting and re-opening the database
      const { deleteDB } = await import('idb');
      await deleteDB('travel-panel');
      // Reload to reinitialise the DB and clear React state
      window.location.href = '/';
    } catch {
      setClearState('idle');
    }
  }

  const exportLabel =
    exportState === 'loading' ? 'Exporting…' :
    exportState === 'done'    ? '✓ Downloaded!' :
    'Download my data (JSON)';

  const clearLabel =
    clearState === 'confirm'  ? 'Tap again to confirm — this cannot be undone' :
    clearState === 'clearing' ? 'Clearing…' :
    'Clear all data';

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3 pt-safe-header">
          <Link href="/" className="text-indigo-600 flex items-center gap-1 text-sm font-medium">
            <ChevronLeft size={18} />
            Back
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-900">Settings</h1>
          <div className="w-14" /> {/* spacer for centering */}
        </div>
      </div>

      <div className="px-4 py-6 pb-nav max-w-lg mx-auto">

        {/* Your data stats */}
        {stats && (
          <div className="bg-indigo-50 rounded-2xl p-4 mb-6 flex justify-around">
            {[
              { count: stats.items,  label: 'Clips'    },
              { count: stats.boards, label: 'Boards'   },
              { count: stats.trips,  label: 'Itineries' },
            ].map(({ count, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-indigo-700">{count}</p>
                <p className="text-xs text-indigo-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Backup & Export */}
        <SettingsSection title="Backup & Export">
          <SettingsRow
            icon={<Download size={18} />}
            label={exportLabel}
            onClick={exportState === 'idle' ? handleExport : undefined}
            disabled={exportState === 'loading'}
          />
        </SettingsSection>

        {/* Cloud sync — coming soon */}
        <SettingsSection title="Cloud Sync">
          <SettingsRow
            icon={<Cloud size={18} />}
            label="Sync across devices"
            value="Coming soon"
            disabled
          />
        </SettingsSection>

        {/* Storage */}
        <SettingsSection title="Storage">
          <SettingsRow
            icon={<Database size={18} />}
            label="Local storage"
            value={stats ? `${stats.items} clips · ${stats.boards} boards` : '…'}
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsRow
            icon={<Info size={18} />}
            label="TravelPanel"
            value="v1.0"
          />
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection title="Danger zone">
          <SettingsRow
            icon={<Trash2 size={18} />}
            label={clearLabel}
            onClick={clearState !== 'clearing' ? handleClearAll : undefined}
            danger
            disabled={clearState === 'clearing'}
          />
        </SettingsSection>

        <p className="text-xs text-gray-400 text-center mt-4 px-4">
          Data is stored locally on this device. Export a backup before clearing.
        </p>
      </div>
    </div>
  );
}
