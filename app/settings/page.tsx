'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Database, Info, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { buildExport, downloadJSON, importFromJSON } from '@/lib/exportData';

type ExportState = 'idle' | 'loading' | 'done' | 'error';
type ImportState = 'idle' | 'confirm' | 'loading' | 'done' | 'error';

// ─── Settings sections ────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-1 mt-5">
      {children}
    </p>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  sublabel,
  right,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white text-left transition-colors ${
        onClick ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
      } ${danger ? 'text-red-500' : 'text-gray-800'}`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          danger ? 'bg-red-50' : 'bg-indigo-50'
        }`}
      >
        <Icon size={17} className={danger ? 'text-red-500' : 'text-indigo-600'} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-800'}`}>
          {label}
        </span>
        {sublabel && (
          <span className="block text-xs text-gray-400 mt-0.5">{sublabel}</span>
        )}
      </span>
      {right ?? (onClick && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />)}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportSummary, setExportSummary] = useState('');

  const [importState, setImportState] = useState<ImportState>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: Record<string, number>; skipped: Record<string, number> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await buildExport();
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `travelpanel-backup-${date}.json`);
      setExportSummary(
        `${data.summary.clips} clips · ${data.summary.boards} boards · ${data.summary.trips} trips`
      );
      setExportState('done');
      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  // ── Import / Restore ───────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setImportState('confirm');
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setImportState('loading');
    try {
      const text = await pendingFile.text();
      const json = JSON.parse(text);
      const result = await importFromJSON(json);
      setImportResult(result);
      setImportState('done');
    } catch {
      setImportState('error');
    }
  }

  function resetImport() {
    setImportState('idle');
    setPendingFile(null);
    setImportResult(null);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  const exportLabel =
    exportState === 'loading' ? 'Preparing export…'
    : exportState === 'done'  ? `Downloaded! (${exportSummary})`
    : exportState === 'error' ? 'Export failed — try again'
    : 'Export all data as JSON';

  const exportSubLabel = exportState === 'idle'
    ? 'Boards, clips, substance & trips in one file'
    : undefined;

  const importLabel =
    importState === 'loading' ? 'Importing…'
    : importState === 'done'  ? `Imported ${importResult?.imported.clips ?? 0} clips, ${importResult?.imported.boards ?? 0} boards`
    : importState === 'error' ? 'Import failed — invalid file'
    : 'Restore from backup';

  const importSubLabel = importState === 'idle'
    ? 'Load a travelpanel-backup-*.json file'
    : importState === 'done'
    ? `Skipped ${(importResult?.skipped.clips ?? 0) + (importResult?.skipped.boards ?? 0)} duplicates`
    : undefined;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Restore confirm dialog */}
      {importState === 'confirm' && pendingFile && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Restore from backup?</h2>
            <p className="text-sm text-gray-600">
              <strong>{pendingFile.name}</strong> will be merged into your library.
              Existing clips and boards won&apos;t be overwritten.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetImport}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* Data section */}
      <SectionHeader>Data</SectionHeader>
      <div className="rounded-xl overflow-hidden mx-3 divide-y divide-gray-100 shadow-sm">
        <SettingsRow
          icon={Download}
          label={exportLabel}
          sublabel={exportSubLabel}
          onClick={exportState === 'loading' ? undefined : handleExport}
          right={
            exportState === 'loading' ? (
              <span className="text-xs text-indigo-500 animate-pulse">…</span>
            ) : exportState === 'done' ? (
              <span className="text-xs text-green-500 font-medium">✓</span>
            ) : exportState === 'error' ? (
              <span className="text-xs text-red-500 font-medium">✗</span>
            ) : undefined
          }
        />
        <SettingsRow
          icon={Upload}
          label={importLabel}
          sublabel={importSubLabel}
          onClick={
            importState === 'loading'
              ? undefined
              : importState === 'done' || importState === 'error'
              ? resetImport
              : () => fileInputRef.current?.click()
          }
          right={
            importState === 'loading' ? (
              <span className="text-xs text-indigo-500 animate-pulse">…</span>
            ) : importState === 'done' ? (
              <span className="text-xs text-green-500 font-medium">✓</span>
            ) : importState === 'error' ? (
              <span className="text-xs text-red-500 font-medium">✗</span>
            ) : undefined
          }
        />
        <SettingsRow
          icon={Database}
          label="Storage"
          sublabel="All data lives on this device (IndexedDB)"
        />
      </div>

      {/* About section */}
      <SectionHeader>About</SectionHeader>
      <div className="rounded-xl overflow-hidden mx-3 divide-y divide-gray-100 shadow-sm">
        <SettingsRow
          icon={Info}
          label="TravelPanel"
          sublabel="Travel inspiration clipper + AI trip planner"
        />
      </div>

      <p className="text-xs text-gray-400 px-7 mt-4 leading-relaxed">
        Exported files include all boards, clips, substance items, and saved trips.
        Restore adds new items without overwriting existing ones.
      </p>

      <NavBar active="settings" />
    </main>
  );
}
