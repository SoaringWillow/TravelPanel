'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, X, Database, Loader2 } from 'lucide-react';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  itemCount: number;
}

export default function SettingsSheet({ open, onClose, itemCount }: SettingsSheetProps) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportMsg(null);
    try {
      const { importFromBackup } = await import('@/lib/importData');
      const result = await importFromBackup(file);
      const skipped = result.skippedItems + result.skippedBoards;
      setImportMsg(
        `Imported ${result.importedItems} clip${result.importedItems !== 1 ? 's' : ''}` +
        (result.importedBoards > 0 ? `, ${result.importedBoards} board${result.importedBoards !== 1 ? 's' : ''}` : '') +
        (skipped > 0 ? ` (${skipped} already existed)` : '')
      );
    } catch {
      setImportMsg('Could not read backup file. Make sure it\'s a TravelPanel JSON export.');
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 5000);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { exportAllData } = await import('@/lib/exportData');
      await exportAllData();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-3xl safe-bottom"
            style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.12)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Settings</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-2 pb-8">
              {/* Data section */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Your Data
              </p>

              {/* Storage summary */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
                <Database size={18} className="text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {itemCount} clip{itemCount !== 1 ? 's' : ''} saved
                  </p>
                  <p className="text-xs text-gray-400">Stored locally on this device</p>
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting || itemCount === 0}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-50 rounded-2xl transition-all"
              >
                {exporting ? (
                  <Loader2 size={18} className="text-indigo-500 animate-spin flex-shrink-0" />
                ) : (
                  <Download size={18} className="text-indigo-500 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-indigo-700">
                    {exported ? '✓ Download started!' : 'Export all my data'}
                  </p>
                  <p className="text-xs text-indigo-500">
                    JSON backup — clips, boards & trip plans
                  </p>
                </div>
              </button>

              {itemCount === 0 && (
                <p className="text-xs text-center text-gray-400 pt-1">
                  Save some clips first to enable export
                </p>
              )}

              {/* Import button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 rounded-2xl transition-all"
              >
                {importing ? (
                  <Loader2 size={18} className="text-gray-500 animate-spin flex-shrink-0" />
                ) : (
                  <Upload size={18} className="text-gray-500 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">
                    Import backup
                  </p>
                  <p className="text-xs text-gray-400">
                    Restore from a TravelPanel JSON backup
                  </p>
                </div>
              </button>

              {importMsg && (
                <p className={`text-xs text-center px-2 py-1.5 rounded-xl ${
                  importMsg.startsWith('Could not')
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {importMsg.startsWith('Could not') ? '' : '✓ '}{importMsg}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
