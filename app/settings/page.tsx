'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, ChevronRight, Info, Database } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { collectBackupData, downloadJSON, BackupData } from '@/lib/exportData';
import { track } from '@/lib/analytics';

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 mb-2">
        {title}
      </h2>
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 mx-4">
        {children}
      </div>
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  sublabel,
  onClick,
  destructive = false,
  disabled = false,
  loading = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
        ${onClick && !disabled ? 'active:bg-gray-50' : ''}
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      <div className={`flex-shrink-0 ${destructive ? 'text-red-500' : 'text-indigo-600'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${destructive ? 'text-red-600' : 'text-gray-900'}`}>
          {label}
        </div>
        {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
      </div>
      {loading ? (
        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      ) : badge ? (
        <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      ) : onClick ? (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      ) : null}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats, setStats]       = useState<BackupData['stats'] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    collectBackupData()
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportError('');
    setExported(false);
    try {
      const data = await collectBackupData();
      downloadJSON(data);
      setStats(data.stats);
      setExported(true);
      track('data_exported', {
        clips: data.stats.clips,
        boards: data.stats.boards,
        trips: data.stats.trips,
      });
      setTimeout(() => setExported(false), 4000);
    } catch (err) {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const statLine = stats
    ? `${stats.clips} clip${stats.clips !== 1 ? 's' : ''}, ${stats.boards} board${stats.boards !== 1 ? 's' : ''}, ${stats.trips} trip${stats.trips !== 1 ? 's' : ''}`
    : 'Loading…';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your TravelPanel data</p>
      </div>

      {/* Data summary */}
      {stats && (
        <div className="mx-4 mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Database size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-indigo-700">Your library</div>
              <div className="text-sm text-indigo-600 mt-0.5">{statLine}</div>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <Section title="Data & Privacy">
        <Row
          icon={<Download size={18} />}
          label="Export my data"
          sublabel={
            exported
              ? '✓ Downloaded! Check your Downloads folder.'
              : exportError || `Full backup as JSON — ${statLine}`
          }
          onClick={handleExport}
          loading={exporting}
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Row
          icon={<Info size={18} />}
          label="TravelPanel"
          sublabel="Save travel content • AI-powered trip planning • v1.0"
        />
      </Section>

      {/* Export error */}
      {exportError && (
        <p className="text-sm text-red-500 text-center px-4">{exportError}</p>
      )}

      <NavBar active="settings" />
    </div>
  );
}
