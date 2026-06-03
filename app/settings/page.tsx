'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, ChevronRight, Database, Info, Cloud, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';
import { exportAllData, importBackupFile } from '@/lib/exportData';

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = { type: 'idle' } | { type: 'loading' } | { type: 'success'; msg: string } | { type: 'error'; msg: string };

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  iconColor = 'text-indigo-600',
  iconBg   = 'bg-indigo-50',
  label,
  sublabel,
  onClick,
  loading,
  children,
}: {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || !onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
        ${onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer' : 'cursor-default'}
        disabled:opacity-60`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sublabel}</p>}
      </div>
      {children}
      {onClick && !children && (
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportStatus, setExportStatus] = useState<Status>({ type: 'idle' });
  const [importStatus, setImportStatus] = useState<Status>({ type: 'idle' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExportStatus({ type: 'loading' });
    try {
      await exportAllData();
      setExportStatus({ type: 'success', msg: 'Download started' });
      setTimeout(() => setExportStatus({ type: 'idle' }), 3000);
    } catch (e) {
      setExportStatus({ type: 'error', msg: e instanceof Error ? e.message : 'Export failed' });
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportStatus({ type: 'loading' });
    try {
      const counts = await importBackupFile(file);
      setImportStatus({
        type: 'success',
        msg: `Restored ${counts.items} clips, ${counts.boards} boards, ${counts.trips} trips`,
      });
      setTimeout(() => setImportStatus({ type: 'idle' }), 5000);
    } catch (err) {
      setImportStatus({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Import failed',
      });
    }
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  async function handleClearData() {
    if (typeof window === 'undefined') return;
    try {
      await indexedDB.deleteDatabase('travel-panel');
      localStorage.clear();
      setShowClearConfirm(false);
      window.location.href = '/';
    } catch {
      setShowClearConfirm(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 pt-6 space-y-6">

        {/* ── Appearance section ──────────────────────────────── */}
        <Section title="Appearance">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50 dark:bg-violet-900/30">
                <Palette size={18} className="text-violet-600 dark:text-violet-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Light, dark, or follow system</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </Section>

        {/* ── Data backup section ─────────────────────────────── */}
        <Section title="Data & Backup">
          <Row
            icon={Download}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
            label="Export all data"
            sublabel="Download a JSON backup of all clips, boards, and plans"
            onClick={handleExport}
            loading={exportStatus.type === 'loading'}
          >
            {exportStatus.type === 'loading' && (
              <span className="text-xs text-gray-400 animate-pulse">Preparing…</span>
            )}
          </Row>

          <Row
            icon={Upload}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            label="Restore from backup"
            sublabel="Merge a JSON backup file into your current data"
            onClick={() => fileInputRef.current?.click()}
            loading={importStatus.type === 'loading'}
          >
            {importStatus.type === 'loading' && (
              <span className="text-xs text-gray-400 animate-pulse">Importing…</span>
            )}
          </Row>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </Section>

        {/* Status toasts */}
        <AnimatePresence>
          {(exportStatus.type === 'success' || exportStatus.type === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                exportStatus.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {exportStatus.type === 'success' ? '✓ ' : '✗ '}
              {exportStatus.msg}
            </motion.div>
          )}
          {(importStatus.type === 'success' || importStatus.type === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                importStatus.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {importStatus.type === 'success' ? '✓ ' : '✗ '}
              {importStatus.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sync section (dormant until Supabase keys) ────── */}
        <Section title="Cloud Sync">
          <Row
            icon={Cloud}
            iconColor="text-gray-400"
            iconBg="bg-gray-100"
            label="Cloud Sync"
            sublabel="Coming soon — sync across devices"
          />
        </Section>

        {/* ── Storage section ──────────────────────────────── */}
        <Section title="Storage">
          <Row
            icon={Database}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            label="Local storage"
            sublabel="All data is stored on this device"
          />
          <Row
            icon={Trash2}
            iconColor="text-red-600"
            iconBg="bg-red-50"
            label="Clear all data"
            sublabel="Permanently delete all clips, boards, and plans"
            onClick={() => setShowClearConfirm(true)}
          />
        </Section>

        {/* ── About section ────────────────────────────────── */}
        <Section title="About">
          <Row
            icon={Info}
            iconColor="text-gray-500"
            iconBg="bg-gray-100"
            label="TravelPanel"
            sublabel="v1.0 · Travel inspiration clipper + AI trip planner"
          />
        </Section>

      </div>

      {/* ── Clear confirm modal ──────────────────────────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/40 flex items-end"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={22} className="text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Clear all data?</h2>
                <p className="text-sm text-gray-500 max-w-xs">
                  This permanently deletes all clips, boards, and plans from this device.
                  This cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleClearData}
                  className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-semibold text-sm hover:bg-red-700 transition-colors"
                >
                  Yes, clear everything
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="settings" />
    </div>
  );
}
