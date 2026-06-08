'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Cloud,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { buildExport, downloadJson } from '@/lib/exportData';
import { getAllItems, getAllBoards } from '@/lib/db';
import { cloudEnabled } from '@/lib/supabase';
import NavBar from '@/components/NavBar';

// ─── Settings row component ───────────────────────────────────────────────────

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
  right,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
        onClick ? 'hover:bg-gray-50 active:bg-gray-100' : ''
      }`}
    >
      <span className={`text-lg flex-shrink-0 ${danger ? 'text-red-500' : 'text-indigo-500'}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
      {right ?? (onClick ? <ChevronRight size={16} className="text-gray-300 flex-shrink-0" /> : null)}
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({ items: 0, boards: 0 });
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([items, boards]) => {
      setCounts({ items: items.filter((i) => !i.isDemo).length, boards: boards.filter((b) => !b.isDemo).length });
    });
  }, []);

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await buildExport();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `travelpanel-backup-${date}.json`);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  const exportLabel =
    exportState === 'loading' ? 'Preparing…' :
    exportState === 'done'    ? 'Downloaded!' :
    exportState === 'error'   ? 'Failed' :
    'Download backup';

  const exportIcon =
    exportState === 'done'  ? <CheckCircle2 size={16} className="text-green-500" /> :
    exportState === 'error' ? <AlertCircle  size={16} className="text-red-500"   /> :
    null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Data summary card */}
        <div className="mx-4 mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{counts.items}</p>
              <p className="text-xs text-gray-500 mt-0.5">Clips saved</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{counts.boards}</p>
              <p className="text-xs text-gray-500 mt-0.5">Collections</p>
            </div>
          </div>
        </div>

        {/* Data section */}
        <SectionHeader>Your data</SectionHeader>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 overflow-hidden">
          <SettingsRow
            icon={<Download size={18} />}
            title={exportLabel}
            subtitle="Download all your clips, boards, and trip plans as JSON."
            onClick={exportState === 'idle' ? handleExport : undefined}
            right={
              exportState === 'loading' ? (
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : exportIcon
            }
          />
          <Divider />
          <SettingsRow
            icon={<Cloud size={18} />}
            title="Cloud sync"
            subtitle={
              cloudEnabled
                ? 'Connected — your data syncs automatically.'
                : 'Not connected. Add Supabase keys to enable cross-device sync and backup.'
            }
            right={
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  cloudEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cloudEnabled ? 'Active' : 'Inactive'}
              </span>
            }
          />
        </div>

        {/* About section */}
        <SectionHeader>About</SectionHeader>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 overflow-hidden">
          <SettingsRow
            icon={<Info size={18} />}
            title="TravelPanel"
            subtitle="Travel inspiration clipper + AI trip planner. Save posts from Instagram, YouTube, or Xiaohongshu and generate multi-day itineraries from your own clips."
            right={null}
          />
          <Divider />
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400">
              Version 1.0 · Built with Claude Sonnet · Data stored locally on your device
            </p>
          </div>
        </div>

        {/* Format info */}
        <div className="mx-4 mt-4 flex gap-2 bg-blue-50 rounded-xl p-3.5">
          <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 leading-relaxed">
            The backup JSON contains all your clips (including extracted locations and wisdom),
            boards, and trip plans. Keep a copy before clearing your browser data.
          </p>
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
