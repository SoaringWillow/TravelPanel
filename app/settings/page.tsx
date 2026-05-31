'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Upload, Trash2, CheckCircle2, AlertTriangle, ChevronRight, Info,
} from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ─── Backup format ────────────────────────────────────────────────────────────

interface BackupFile {
  version: 2;
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

async function exportData(): Promise<void> {
  const boards = await getAllBoards();
  const items = await getAllItems();

  const tripsPerBoard = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripsPerBoard.flat();

  const backup: BackupFile = {
    version: 2,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

interface ImportResult {
  itemsImported: number;
  boardsImported: number;
  tripsImported: number;
}

async function importData(file: File): Promise<ImportResult> {
  const text = await file.text();
  const backup = JSON.parse(text) as BackupFile;

  if (backup.version !== 2 && (backup as { version: number }).version !== 1) {
    throw new Error('Unrecognised backup format. Only TravelPanel backup files are supported.');
  }

  const counts: ImportResult = { itemsImported: 0, boardsImported: 0, tripsImported: 0 };

  // Import boards first (items reference boardId)
  for (const board of backup.boards ?? []) {
    await saveBoard(board);
    counts.boardsImported++;
  }

  for (const item of backup.items ?? []) {
    await saveItem(item);
    counts.itemsImported++;
  }

  for (const trip of backup.trips ?? []) {
    await saveTrip(trip);
    counts.tripsImported++;
  }

  return counts;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

function SectionRow({
  icon,
  title,
  subtitle,
  onClick,
  destructive = false,
  disabled = false,
  rightContent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  rightContent?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors disabled:opacity-50 ${
        onClick && !disabled ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
      }`}
    >
      <div className={`flex-shrink-0 ${destructive ? 'text-red-500' : 'text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${destructive ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      {rightContent ?? (onClick && !disabled && (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      ))}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function SettingsPage() {
  const [stats, setStats] = useState<{ items: number; boards: number; trips: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stats on mount
  useEffect(() => {
    (async () => {
      const boards = await getAllBoards();
      const items = await getAllItems();
      const trips = (await Promise.all(boards.map((b) => getTripsForBoard(b.id)))).flat();
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    })();
  }, []);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportData();
      showToast('success', 'Backup downloaded successfully.');
    } catch {
      showToast('error', 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const result = await importData(file);
      showToast(
        'success',
        `Imported ${result.itemsImported} clips, ${result.boardsImported} boards, ${result.tripsImported} trips.`
      );
      // Refresh stats
      const boards = await getAllBoards();
      const items = await getAllItems();
      const trips = (await Promise.all(boards.map((b) => getTripsForBoard(b.id)))).flat();
      setStats({ items: items.length, boards: boards.length, trips: trips.length });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Import failed. Is this a valid TravelPanel backup?');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 space-y-5">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Clips" value={stats.items} />
            <StatCard label="Boards" value={stats.boards} />
            <StatCard label="Trips" value={stats.trips} />
          </div>
        )}

        {/* Data & Backup */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            Data &amp; Backup
          </p>
          <SectionCard>
            <SectionRow
              icon={<Download size={18} />}
              title="Export all data"
              subtitle="Download a full backup as JSON. Includes all clips, boards, and trip plans."
              onClick={handleExport}
              disabled={exporting}
              rightContent={
                exporting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin" />
                ) : undefined
              }
            />
            <div className="h-px bg-gray-100 mx-4" />
            <SectionRow
              icon={<Upload size={18} />}
              title="Import from backup"
              subtitle="Restore clips and boards from a previous TravelPanel backup file."
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              rightContent={
                importing ? (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin" />
                ) : undefined
              }
            />
          </SectionCard>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
        </div>

        {/* Cloud sync */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            Cloud Sync
          </p>
          <SectionCard>
            <SectionRow
              icon={<Info size={18} />}
              title="Cloud sync is not yet active"
              subtitle="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable automatic backup across devices."
            />
          </SectionCard>
        </div>

        {/* AI features */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            AI Features
          </p>
          <SectionCard>
            <SectionRow
              icon={<Info size={18} />}
              title="Semantic search"
              subtitle="Set VOYAGE_API_KEY to enable vibe search (e.g. 'minimalist cafe Tokyo'). Free tier at voyageai.com."
            />
          </SectionCard>
        </div>

        {/* About */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
            About
          </p>
          <SectionCard>
            <SectionRow
              icon={<span className="text-base">✈</span>}
              title="TravelPanel"
              subtitle="Save travel inspiration. Build real trips. v1.0"
            />
          </SectionCard>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed bottom-24 left-4 right-4 z-[3000]"
          >
            <div
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="settings" />
    </div>
  );
}
