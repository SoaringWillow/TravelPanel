'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Trash2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupFile {
  version: number;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

type ImportStatus = 'idle' | 'importing' | 'done' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importSummary, setImportSummary] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ──────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    try {
      const [items, boards, trips] = await Promise.all([
        getAllItems(),
        getAllBoards(),
        getAllTrips(),
      ]);

      const backup: BackupFile = {
        version: 1,
        exportedAt: new Date().toISOString(),
        items,
        boards,
        trips,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travelpanel-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportStatus('importing');
    setImportError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupFile;

      if (!data.version || !Array.isArray(data.items) || !Array.isArray(data.boards)) {
        throw new Error('Invalid backup file format');
      }

      let itemCount = 0;
      let boardCount = 0;
      let tripCount = 0;

      // Import in parallel batches
      await Promise.all([
        ...data.items.map(async (item) => {
          await saveItem(item);
          itemCount++;
        }),
        ...data.boards.map(async (board) => {
          await saveBoard(board);
          boardCount++;
        }),
        ...(data.trips ?? []).map(async (trip) => {
          await saveTrip(trip);
          tripCount++;
        }),
      ]);

      setImportSummary(
        `Restored ${itemCount} clip${itemCount !== 1 ? 's' : ''}, ` +
        `${boardCount} board${boardCount !== 1 ? 's' : ''}` +
        (tripCount > 0 ? `, ${tripCount} trip plan${tripCount !== 1 ? 's' : ''}` : '')
      );
      setImportStatus('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to read backup file');
      setImportStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 header-safe pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Data & Backup section */}
        <Section title="Data & Backup">
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            All your clips, boards, and trip plans are stored on this device.
            Export a backup before switching devices or clearing app data.
          </p>

          {/* Export button */}
          <ActionButton
            icon={Download}
            title="Download backup"
            subtitle="Saves all clips, boards, and plans as JSON"
            onClick={handleExport}
            loading={exporting}
            loadingLabel="Preparing…"
          />

          {/* Import button */}
          <ActionButton
            icon={Upload}
            title="Restore from backup"
            subtitle="Merges a previously exported JSON file into this device"
            onClick={handleImportClick}
            loading={importStatus === 'importing'}
            loadingLabel="Importing…"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelected}
          />

          {/* Import feedback */}
          <AnimatePresence>
            {importStatus === 'done' && (
              <motion.div
                key="import-success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100"
              >
                <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Import complete</p>
                  <p className="text-xs text-green-700 mt-0.5">{importSummary}</p>
                </div>
              </motion.div>
            )}
            {importStatus === 'error' && (
              <motion.div
                key="import-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100"
              >
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Import failed</p>
                  <p className="text-xs text-red-700 mt-0.5">{importError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* About section */}
        <Section title="About">
          <InfoRow label="App" value="TravelPanel" />
          <InfoRow label="Storage" value="On-device (IndexedDB)" />
          <InfoRow label="AI" value="Claude by Anthropic" />
          <InfoRow label="Maps" value="OpenFreeMap (no API key)" />
          <div className="mt-3 pt-3 border-t border-gray-50">
            <a
              href="/privacy"
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Privacy Policy →
            </a>
          </div>
        </Section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  loading,
  loadingLabel,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors disabled:opacity-60"
    >
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{loading ? loadingLabel : title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
