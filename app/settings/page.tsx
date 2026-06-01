'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Database,
  Cloud,
  Sparkles,
} from 'lucide-react';
import { exportAllData, importBackup } from '@/lib/exportData';
import NavBar from '@/components/NavBar';

// ─── Section components ──────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 mb-2 mt-6">
      {children}
    </p>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  description,
  action,
  badge,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  description?: string;
  action: React.ReactNode;
  badge?: 'pro' | 'soon';
}) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
          {badge === 'soon' && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              SOON
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [importState, setImportState] = useState<
    'idle' | 'loading' | { itemsImported: number; boardsImported: number } | 'error'
  >('idle');

  async function handleExport() {
    setExportState('loading');
    try {
      await exportAllData();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState('loading');
    try {
      const result = await importBackup(file);
      setImportState(result);
      setTimeout(() => setImportState('idle'), 4000);
    } catch {
      setImportState('error');
      setTimeout(() => setImportState('idle'), 3000);
    }
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const exportLabel =
    exportState === 'loading' ? 'Exporting…' :
    exportState === 'done'    ? 'Downloaded!' :
    exportState === 'error'   ? 'Failed'      : 'Export JSON';

  const importLabel =
    importState === 'loading'          ? 'Importing…' :
    typeof importState === 'object'    ? `Imported ${importState.itemsImported} clips` :
    importState === 'error'            ? 'Failed'     : 'Import backup';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4 pt-safe">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>
      </div>

      {/* Data section */}
      <SectionHeader>Your data</SectionHeader>
      <div className="rounded-2xl overflow-hidden mx-3 border border-gray-200 dark:border-gray-700">
        <SettingsRow
          icon={Download}
          label="Export backup"
          description="Download all your clips and boards as a JSON file"
          action={
            <button
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                exportState === 'done'
                  ? 'text-green-700 bg-green-50'
                  : exportState === 'error'
                  ? 'text-red-600 bg-red-50'
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95'
              }`}
            >
              {exportState === 'done' ? (
                <CheckCircle2 size={14} />
              ) : exportState === 'error' ? (
                <AlertCircle size={14} />
              ) : (
                <Download size={14} />
              )}
              {exportLabel}
            </button>
          }
        />
        <SettingsRow
          icon={Upload}
          label="Import backup"
          description="Restore clips and boards from a TravelPanel backup file"
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState === 'loading'}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  typeof importState === 'object'
                    ? 'text-green-700 bg-green-50'
                    : importState === 'error'
                    ? 'text-red-600 bg-red-50'
                    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95'
                }`}
              >
                {typeof importState === 'object' ? (
                  <CheckCircle2 size={14} />
                ) : importState === 'error' ? (
                  <AlertCircle size={14} />
                ) : (
                  <Upload size={14} />
                )}
                {importLabel}
              </button>
            </>
          }
        />
      </div>

      {/* Cloud section */}
      <SectionHeader>Cloud sync</SectionHeader>
      <div className="rounded-2xl overflow-hidden mx-3 border border-gray-200 dark:border-gray-700">
        <SettingsRow
          icon={Cloud}
          label="Sync across devices"
          description="Sign in to sync your clips to the cloud and access them anywhere"
          badge="soon"
          action={
            <span className="text-xs text-gray-400 font-medium">Needs Supabase keys</span>
          }
        />
        <SettingsRow
          icon={Sparkles}
          label="Vibe search"
          description="Search by feeling — &ldquo;minimalist cafe Tokyo&rdquo; or &ldquo;hidden beach Bali&rdquo;"
          badge="soon"
          action={
            <span className="text-xs text-gray-400 font-medium">Needs cloud sync</span>
          }
        />
      </div>

      {/* Storage section */}
      <SectionHeader>About</SectionHeader>
      <div className="rounded-2xl overflow-hidden mx-3 border border-gray-200 dark:border-gray-700">
        <SettingsRow
          icon={Database}
          label="Local storage"
          description="All your data lives on this device. Export regularly to back it up."
          action={<span className="text-xs text-gray-400">IndexedDB</span>}
        />
      </div>

      <NavBar active="settings" />
    </div>
  );
}
