'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Trash2,
  BarChart2,
  Info,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Map,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { getRateLimitStatus } from '@/lib/rateLimits';
import { SavedItem, Board, Trip } from '@/lib/types';

// ─── Export helpers ────────────────────────────────────────────────────────────

interface BackupPayload {
  exportDate: string;
  version: string;
  counts: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

async function buildExport(): Promise<BackupPayload> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);
  return {
    exportDate: new Date().toISOString(),
    version: '1',
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

function downloadJson(data: BackupPayload) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats] = useState<{ items: number; boards: number; trips: number } | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [clearState, setClearState]   = useState<'idle' | 'confirm' | 'clearing' | 'done'>('idle');
  const [rateLimits, setRateLimits]   = useState<ReturnType<typeof getRateLimitStatus> | null>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards(), getAllTrips()]).then(([items, boards, trips]) => {
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    });
    setRateLimits(getRateLimitStatus());
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await buildExport();
      downloadJson(data);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleClearData() {
    if (clearState === 'idle') {
      setClearState('confirm');
      return;
    }
    if (clearState === 'confirm') {
      setClearState('clearing');
      try {
        const { deleteDatabase } = await import('@/lib/db');
        await deleteDatabase();
        setClearState('done');
        // Reload after a moment so IndexedDB re-initialises
        setTimeout(() => window.location.assign('/'), 2000);
      } catch {
        setClearState('idle');
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-navbar">
      {/* Header */}
      <div
        className="bg-gradient-to-br from-indigo-600 to-violet-700 pt-14 pb-8 px-5"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top, 3.5rem))' }}
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-indigo-200 text-sm mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Stats card */}
        <Section title="Your Data">
          {stats ? (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <Stat label="Clips" value={stats.items} />
              <Stat label="Collections" value={stats.boards} />
              <Stat label="Plans" value={stats.trips} />
            </div>
          ) : (
            <div className="px-4 py-5 text-sm text-gray-400 animate-pulse">Loading…</div>
          )}
        </Section>

        {/* Export */}
        <Section title="Backup & Export">
          <Row
            icon={<Download size={18} />}
            iconColor="text-indigo-600 bg-indigo-50"
            label="Download all my data"
            sublabel="Exports clips, boards, and plans as JSON"
            onClick={handleExport}
            disabled={exportState === 'loading'}
            rightSlot={
              exportState === 'loading' ? (
                <span className="text-xs text-gray-400 animate-pulse">Preparing…</span>
              ) : exportState === 'done' ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : exportState === 'error' ? (
                <span className="text-xs text-red-500">Failed</span>
              ) : (
                <ChevronRight size={16} className="text-gray-300" />
              )
            }
          />
        </Section>

        {/* Rate limits */}
        {rateLimits && (
          <Section title="Usage">
            <div className="px-4 py-3 space-y-3">
              <UsageBar
                label="Enrichments today"
                used={rateLimits.enrichments.used}
                max={rateLimits.enrichments.max}
                resetsIn={rateLimits.enrichments.resetsAt}
              />
              <UsageBar
                label="Plans generated today"
                used={rateLimits.plans.used}
                max={rateLimits.plans.max}
                resetsIn={rateLimits.plans.resetsAt}
              />
            </div>
          </Section>
        )}

        {/* About */}
        <Section title="About">
          <Row
            icon={<Map size={18} />}
            iconColor="text-violet-600 bg-violet-50"
            label="TravelPanel"
            sublabel="v1.0 · AI-powered travel inspiration"
            rightSlot={<span className="text-xs text-gray-400">v1.0</span>}
          />
          <Row
            icon={<Info size={18} />}
            iconColor="text-blue-600 bg-blue-50"
            label="Send feedback"
            sublabel="Report issues or suggest features"
            onClick={() => window.open('https://github.com/soaringwillow/travelpanel/issues', '_blank')}
            rightSlot={<ChevronRight size={16} className="text-gray-300" />}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          {clearState === 'done' ? (
            <div className="px-4 py-4 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 size={16} /> Data cleared — reloading…
            </div>
          ) : (
            <Row
              icon={<Trash2 size={18} />}
              iconColor="text-red-600 bg-red-50"
              label={clearState === 'confirm' ? 'Tap again to confirm — this cannot be undone' : 'Clear all data'}
              sublabel={clearState === 'confirm' ? '' : 'Permanently delete all clips, boards, and plans'}
              labelColor={clearState === 'confirm' ? 'text-red-600' : undefined}
              onClick={handleClearData}
              disabled={clearState === 'clearing'}
              rightSlot={
                clearState === 'confirm'
                  ? <AlertTriangle size={16} className="text-red-500" />
                  : clearState === 'clearing'
                  ? <span className="text-xs text-gray-400 animate-pulse">Clearing…</span>
                  : <ChevronRight size={16} className="text-gray-300" />
              }
            />
          )}
        </Section>

        <p className="text-center text-xs text-gray-400 pb-2">
          All data is stored locally on this device.{' '}
          <span className="text-indigo-500">Cloud sync coming soon.</span>
        </p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100"
    >
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

interface RowProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  sublabel?: string;
  labelColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
}

function Row({ icon, iconColor, label, sublabel, labelColor, onClick, disabled, rightSlot }: RowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 border-t border-gray-50 text-left transition-colors ${
        onClick && !disabled ? 'hover:bg-gray-50 active:bg-gray-100' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${labelColor ?? 'text-gray-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      {rightSlot && <span className="flex-shrink-0">{rightSlot}</span>}
    </Tag>
  );
}

function UsageBar({
  label,
  used,
  max,
  resetsIn,
}: {
  label: string;
  used: number;
  max: number;
  resetsIn: number;
}) {
  const pct = Math.min((used / max) * 100, 100);
  const hoursLeft = Math.max(0, Math.ceil((resetsIn - Date.now()) / 3600000));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">
          {used}/{max} · resets in {hoursLeft}h
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-amber-400' : 'bg-indigo-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
