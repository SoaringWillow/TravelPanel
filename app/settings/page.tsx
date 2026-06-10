'use client';

import { useState } from 'react';
import { Download, Trash2, ChevronRight, Database, Info, Shield } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData } from '@/lib/exportData';
import { getAllItems, getAllBoards, deleteItem, deleteBoard } from '@/lib/db';

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 px-4 mb-1">
        {title}
      </p>
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-700 mx-0">
        {children}
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  sublabel,
  right,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
        ${onClick && !disabled ? 'active:bg-gray-50 dark:active:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer' : 'cursor-default'}
        ${danger ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}
        ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`flex-shrink-0 ${danger ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">{sublabel}</p>
        )}
      </div>
      {right ?? (onClick && <ChevronRight size={15} className="text-gray-300 dark:text-slate-600 flex-shrink-0" />)}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [stats, setStats] = useState<{ items: number; boards: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'loading' | 'done'>('idle');

  // Load stats on mount for the delete confirmation
  async function loadStats() {
    const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
    setStats({ items: items.length, boards: boards.length });
  }

  async function handleExport() {
    if (exportState === 'loading') return;
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

  async function handleDeleteAll() {
    setDeleteState('loading');
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      await Promise.all([
        ...items.map(i => deleteItem(i.id)),
        ...boards.map(b => deleteBoard(b.id)),
      ]);
      setDeleteState('done');
      setShowDeleteConfirm(false);
    } catch {
      setDeleteState('idle');
    }
  }

  const exportLabel =
    exportState === 'loading' ? 'Preparing download…' :
    exportState === 'done'    ? 'Download started ✓' :
    exportState === 'error'   ? 'Export failed' :
    'Export all data (JSON)';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 header-pt-safe pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
      </div>

      <div className="px-4 pt-5">
        {/* Data management */}
        <Section title="Data">
          <Row
            icon={<Download size={18} />}
            label={exportLabel}
            sublabel="Saves a JSON file with all your clips, boards, and trips"
            disabled={exportState === 'loading'}
            onClick={handleExport}
            right={exportState === 'loading' ? (
              <span className="text-xs text-indigo-500 animate-pulse flex-shrink-0">Working…</span>
            ) : exportState === 'done' ? (
              <span className="text-xs text-green-600 flex-shrink-0">✓</span>
            ) : undefined}
          />
          <Row
            icon={<Database size={18} />}
            label="Storage"
            sublabel="All data is stored locally on this device"
            right={<span className="text-xs text-gray-400 flex-shrink-0">IndexedDB</span>}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <Row
            icon={<Trash2 size={18} />}
            label="Delete all data"
            sublabel="Permanently removes all clips, boards, and trips"
            danger
            onClick={() => { loadStats(); setShowDeleteConfirm(true); }}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row
            icon={<Info size={18} />}
            label="TravelPanel"
            sublabel="AI-powered travel inspiration clipper"
            right={<span className="text-xs text-gray-400 flex-shrink-0">v1.0</span>}
          />
          <Row
            icon={<Shield size={18} />}
            label="Privacy"
            sublabel="Your data stays on your device. No account required."
          />
        </Section>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Delete everything?</h2>
              {stats && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  This will permanently delete {stats.items} clip{stats.items !== 1 ? 's' : ''} and{' '}
                  {stats.boards} board{stats.boards !== 1 ? 's' : ''}. This cannot be undone.
                </p>
              )}
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center">
              Export your data first if you want a backup.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleteState === 'loading'}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteState === 'loading' ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar active="settings" />
    </div>
  );
}
