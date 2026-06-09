'use client';

import { useState } from 'react';
import {
  Download, Trash2, Info, ExternalLink,
  CheckCircle2, AlertTriangle, Database,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJSON } from '@/lib/exportData';
import { track } from '@/lib/analytics';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="px-4 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </div>
      <div className="mx-3 bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function Row({
  icon: Icon,
  iconColor = 'text-gray-500',
  iconBg = 'bg-gray-100',
  label,
  sublabel,
  right,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors
        ${onClick ? 'active:bg-gray-50 hover:bg-gray-50/70 cursor-pointer' : 'cursor-default'}
        not-first:border-t not-first:border-gray-100`}
      onClick={onClick}
      type="button"
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[15px] font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {label}
        </span>
        {sublabel && (
          <span className="block text-xs text-gray-400 mt-0.5 leading-snug">{sublabel}</span>
        )}
      </span>
      {right && <span className="text-sm text-gray-400 flex-shrink-0">{right}</span>}
    </button>
  );
}

// ─── Export button with states ────────────────────────────────────────────────

type ExportState = 'idle' | 'loading' | 'done' | 'error';

function ExportRow() {
  const [state, setState] = useState<ExportState>('idle');
  const [counts, setCounts] = useState<{ items: number; boards: number; trips: number } | null>(null);

  async function handleExport() {
    if (state === 'loading') return;
    setState('loading');
    try {
      const data = await exportAllData();
      setCounts(data.counts);
      downloadJSON(data);
      setState('done');
      track('data_exported', data.counts);
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const icon = state === 'done' ? CheckCircle2
    : state === 'error' ? AlertTriangle
    : Download;

  const iconColor = state === 'done' ? 'text-emerald-600'
    : state === 'error' ? 'text-red-500'
    : 'text-sky-600';

  const iconBg = state === 'done' ? 'bg-emerald-50'
    : state === 'error' ? 'bg-red-50'
    : 'bg-sky-50';

  const sublabel = state === 'loading' ? 'Gathering your data…'
    : state === 'done' && counts
      ? `Exported ${counts.items} clips · ${counts.boards} boards · ${counts.trips} plans`
    : state === 'error' ? 'Export failed — please try again'
    : 'All clips, boards, and plans as a JSON file';

  return (
    <Row
      icon={icon}
      iconColor={iconColor}
      iconBg={iconBg}
      label={state === 'loading' ? 'Exporting…' : state === 'done' ? 'Export saved' : 'Download all my data'}
      sublabel={sublabel}
      right={state === 'idle' ? '›' : undefined}
      onClick={handleExport}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24 pt-0">
      {/* Header */}
      <div className="bg-white pt-14 pb-5 px-4 mb-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
      </div>

      {/* Data section */}
      <Section title="Your Data">
        <ExportRow />
        <Row
          icon={Database}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          label="Storage"
          sublabel="Stored locally on this device (IndexedDB)"
          right={<span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Local</span>}
        />
      </Section>

      {/* Cloud sync — dormant until Supabase keys */}
      <Section title="Cloud Sync">
        <Row
          icon={ExternalLink}
          iconColor="text-gray-400"
          iconBg="bg-gray-100"
          label="Cloud Backup"
          sublabel="Sign in to sync across devices — coming soon"
          right={<span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Soon</span>}
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Row
          icon={Info}
          iconColor="text-gray-500"
          iconBg="bg-gray-100"
          label="TravelPanel"
          sublabel="Save travel inspiration. Plan better trips."
          right="v0.1"
        />
        <a
          href="https://github.com/soaringwillow/travelpanel"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3.5 px-4 py-3.5 border-t border-gray-100
            hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100">
            <ExternalLink size={18} className="text-gray-500" strokeWidth={2} />
          </span>
          <span className="flex-1 text-[15px] font-medium text-gray-900">Source code</span>
          <span className="text-sm text-gray-400">GitHub ↗</span>
        </a>
      </Section>

      <NavBar active="settings" />
    </main>
  );
}
