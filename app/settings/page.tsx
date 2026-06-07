'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Upload, Database, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportBackup, importBackup } from '@/lib/backup';
import { getAllItems, getAllBoards } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

type Status =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportStatus, setExportStatus] = useState<Status>({ type: 'idle' });
  const [importStatus, setImportStatus] = useState<Status>({ type: 'idle' });
  const [stats, setStats]               = useState<{ items: number; boards: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()])
      .then(([items, boards]) => setStats({ items: items.filter((i) => !i.isDemo).length, boards: boards.length }))
      .catch(() => {});
  }, [importStatus]);

  async function handleExport() {
    setExportStatus({ type: 'loading' });
    try {
      await exportBackup();
      setExportStatus({ type: 'success', message: 'Your backup has been downloaded.' });
    } catch {
      setExportStatus({ type: 'error', message: 'Export failed. Please try again.' });
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportStatus({ type: 'loading' });
    try {
      const result = await importBackup(file);
      if (result.errors.length > 0) {
        setImportStatus({ type: 'error', message: result.errors[0] });
      } else {
        setImportStatus({
          type: 'success',
          message: `Restored ${result.imported} records${result.skipped ? ` (${result.skipped} skipped — already exist)` : ''}.`,
        });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Import failed. Is this a valid TravelPanel backup?' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Data Stats */}
        {stats && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700">Your Data</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatPill label="Clips saved" value={stats.items} />
              <StatPill label="Collections" value={stats.boards} />
            </div>
          </div>
        )}

        {/* Export */}
        <Section title="Backup & Export" icon={<Download size={16} className="text-indigo-500" />}>
          <p className="text-sm text-gray-500 mb-4">
            Download all your clips, boards, and trip plans as a JSON file. Excludes demo content.
          </p>
          <ActionButton
            label="Download Backup"
            icon={<Download size={16} />}
            loading={exportStatus.type === 'loading'}
            onClick={handleExport}
            variant="primary"
          />
          <StatusMessage status={exportStatus} />
        </Section>

        {/* Import */}
        <Section title="Restore from Backup" icon={<Upload size={16} className="text-indigo-500" />}>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Restoring merges the backup into your current data — existing clips are not overwritten.
            </p>
          </div>
          <ActionButton
            label="Choose Backup File"
            icon={<Upload size={16} />}
            loading={importStatus.type === 'loading'}
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <StatusMessage status={importStatus} />
        </Section>

        {/* About */}
        <Section title="About" icon={<Info size={16} className="text-indigo-500" />}>
          <div className="space-y-2 text-sm text-gray-500">
            <Row label="App" value="TravelPanel" />
            <Row label="Data stored" value="On this device (IndexedDB)" />
            <Row label="AI" value="Claude by Anthropic" />
          </div>
        </Section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function ActionButton({
  label, icon, loading, onClick, variant,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}) {
  const base = 'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all';
  const styles = {
    primary:   `${base} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`,
    secondary: `${base} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50`,
  };
  return (
    <button className={styles[variant]} onClick={onClick} disabled={loading}>
      {loading ? <span className="animate-spin">⏳</span> : icon}
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (status.type === 'idle' || status.type === 'loading') return null;
  const isSuccess = status.type === 'success';
  return (
    <div className={`flex items-center gap-2 mt-3 text-sm ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
      {isSuccess ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {status.message}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-600 font-medium">{value}</span>
    </div>
  );
}
