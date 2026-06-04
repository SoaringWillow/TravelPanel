'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Database, Info } from 'lucide-react';
import { exportAllData } from '@/lib/exportData';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  clipCount: number;
}

export default function SettingsSheet({ open, onClose, clipCount }: SettingsSheetProps) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1100] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[1101] bg-white rounded-t-3xl shadow-2xl safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-6 pb-8 pt-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Settings</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stats row */}
              <div className="bg-indigo-50 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
                <Database size={18} className="text-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    {clipCount} clip{clipCount !== 1 ? 's' : ''} saved locally
                  </p>
                  <p className="text-xs text-indigo-600">
                    Stored in your browser's IndexedDB
                  </p>
                </div>
              </div>

              {/* Export section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Data
                </p>

                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-2xl transition-colors disabled:opacity-60 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Download size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {exported ? '✅ Exported!' : exporting ? 'Exporting…' : 'Export all data'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Download all clips, boards & trips as JSON
                    </p>
                  </div>
                </button>
              </div>

              {/* Footer note */}
              <div className="mt-6 flex items-start gap-2">
                <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your data is stored locally on this device. Export regularly to prevent
                  data loss if you clear your browser storage.
                  Cloud sync is coming soon.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
