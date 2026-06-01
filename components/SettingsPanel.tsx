'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, ChevronRight, Check, AlertCircle, Moon, Sun } from 'lucide-react';
import { exportAllData, importData } from '@/lib/exportData';
import { useTheme } from '@/components/ThemeProvider';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [exporting, setExporting]   = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importMsg, setImportMsg]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  async function handleExport() {
    setExporting(true);
    try {
      await exportAllData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState('loading');
    setImportMsg('');

    try {
      const text = await file.text();
      const { imported, skipped } = await importData(text);
      setImportMsg(`Imported ${imported} item${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already existed` : ''}.`);
      setImportState('success');
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed');
      setImportState('error');
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[1050] bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[1060] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl pb-10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Appearance</p>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  {theme === 'dark' ? (
                    <Sun size={16} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Moon size={16} className="text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />
              </button>

              {/* Divider */}
              <div className="pt-2 pb-1">
                <div className="border-t border-gray-100 dark:border-gray-700" />
              </div>

              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Data</p>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  {exportDone ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Download size={16} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {exportDone ? 'Download started!' : 'Export all my data'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {exportDone
                      ? 'Check your downloads folder'
                      : 'Download a JSON backup of all clips, boards & plans'}
                  </p>
                </div>
                {!exportDone && <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />}
              </button>

              {/* Import */}
              <button
                onClick={handleImportClick}
                disabled={importState === 'loading'}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  importState === 'success' ? 'bg-green-100 dark:bg-green-900/50' : importState === 'error' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'
                }`}>
                  {importState === 'success' ? (
                    <Check size={16} className="text-green-600" />
                  ) : importState === 'error' ? (
                    <AlertCircle size={16} className="text-red-500" />
                  ) : (
                    <Upload size={16} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {importState === 'loading' ? 'Importing…' : 'Restore from backup'}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    importState === 'success' ? 'text-green-600' :
                    importState === 'error' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {importMsg || 'Import a TravelPanel JSON backup file'}
                  </p>
                </div>
                {importState === 'idle' && <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Divider */}
              <div className="pt-2 pb-1">
                <div className="border-t border-gray-100 dark:border-gray-700" />
              </div>

              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 pt-1">About</p>

              <div className="px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">TravelPanel</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  AI-powered travel inspiration clipper. Your data lives on your device.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
