'use client';

import { useState } from 'react';
import { Download, Trash2, ChevronRight, Info, ShieldCheck, Zap, BarChart2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJSON } from '@/lib/exportData';
import { deleteItem, getAllItems, getAllBoards, deleteBoard } from '@/lib/db';
import { checkEnrichmentLimit, checkPlanLimit } from '@/lib/rateLimits';

// ─── Section layout helpers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 mb-1.5">
        {title}
      </p>
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden mx-4">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  subtitle,
  right,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        onClick ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger ? 'bg-red-100' : 'bg-indigo-100'
        }`}
      >
        <Icon size={16} className={danger ? 'text-red-600' : 'text-indigo-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {right ?? (onClick && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />)}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  // Lazy initializers: safe — localStorage is only accessed in the browser
  const [enrichUsed] = useState(() =>
    typeof window !== 'undefined' ? 10 - checkEnrichmentLimit().remaining : 0
  );
  const [planUsed] = useState(() =>
    typeof window !== 'undefined' ? 5 - checkPlanLimit().remaining : 0
  );

  async function handleExport() {
    setExporting(true);
    setExportDone(false);
    try {
      const data = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `travelpanel-backup-${date}.json`);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  async function handleClearDemoData() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setClearing(true);
    setConfirmClear(false);
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      await Promise.all([
        ...items.filter((i) => i.isDemo).map((i) => deleteItem(i.id)),
        ...boards.filter((b) => b.isDemo).map((b) => deleteBoard(b.id)),
      ]);
      setClearDone(true);
      setTimeout(() => setClearDone(false), 2500);
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">TravelPanel v1.0</p>
      </div>

      <div className="mt-6">
        {/* Usage */}
        <Section title="Usage this session">
          <Row
            icon={Zap}
            label="Enrichments"
            subtitle="Resets every hour"
            onClick={undefined}
            right={
              <span className="text-xs font-semibold text-gray-500">
                {enrichUsed} / 10
              </span>
            }
          />
          <Row
            icon={BarChart2}
            label="Plans generated"
            subtitle="Resets daily"
            onClick={undefined}
            right={
              <span className="text-xs font-semibold text-gray-500">
                {planUsed} / 5
              </span>
            }
          />
        </Section>

        {/* Data */}
        <Section title="Your data">
          <Row
            icon={Download}
            label={exporting ? 'Exporting…' : exportDone ? '✓ Downloaded!' : 'Export all data'}
            subtitle="Download a full JSON backup of all clips, boards, and trip plans"
            onClick={handleExport}
          />
          <Row
            icon={Trash2}
            label={
              clearDone
                ? '✓ Demo data removed'
                : confirmClear
                ? 'Tap again to confirm'
                : clearing
                ? 'Removing…'
                : 'Clear demo content'
            }
            subtitle="Remove the onboarding seed boards and clips"
            onClick={handleClearDemoData}
            danger={confirmClear}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row
            icon={ShieldCheck}
            label="Privacy"
            subtitle="All data is stored locally on your device"
            onClick={undefined}
            right={null}
          />
          <Row
            icon={Info}
            label="Version"
            onClick={undefined}
            right={<span className="text-xs text-gray-400 font-mono">1.0.0</span>}
          />
        </Section>
      </div>

      <NavBar active="settings" />
    </main>
  );
}
