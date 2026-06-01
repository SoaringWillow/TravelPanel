'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  Globe2,
  MapPin,
  Lightbulb,
  LayoutGrid,
  Route,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { buildExportPayload, downloadExport } from '@/lib/exportData';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DataStats {
  totalItems: number;
  totalBoards: number;
  totalTrips: number;
  totalLocations: number;
  totalSubstanceItems: number;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [stats, setStats]           = useState<DataStats | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!open) return;
    buildExportPayload().then((p) => setStats(p.summary));
  }, [open]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadExport();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    // Clear all IndexedDB data by deleting the database, then reload
    indexedDB.deleteDatabase('travel-panel');
    window.location.reload();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[1200] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[1201] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-lg font-bold text-gray-900">Settings &amp; Data</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-5">
              {/* ── Data stats ─────────────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Your Data
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MapPin size={16} className="text-orange-500" />}
                    label="Clips saved"
                    value={stats?.totalItems ?? '—'}
                    bg="bg-orange-50"
                  />
                  <StatCard
                    icon={<LayoutGrid size={16} className="text-indigo-500" />}
                    label="Boards"
                    value={stats?.totalBoards ?? '—'}
                    bg="bg-indigo-50"
                  />
                  <StatCard
                    icon={<Globe2 size={16} className="text-teal-500" />}
                    label="Locations pinned"
                    value={stats?.totalLocations ?? '—'}
                    bg="bg-teal-50"
                  />
                  <StatCard
                    icon={<Lightbulb size={16} className="text-yellow-500" />}
                    label="Wisdom items"
                    value={stats?.totalSubstanceItems ?? '—'}
                    bg="bg-yellow-50"
                  />
                  <StatCard
                    icon={<Route size={16} className="text-purple-500" />}
                    label="Trips planned"
                    value={stats?.totalTrips ?? '—'}
                    bg="bg-purple-50"
                  />
                </div>
              </section>

              {/* ── Export ─────────────────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Backup &amp; Export
                </h3>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group disabled:opacity-60"
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow border border-gray-100">
                    <Download size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">
                      {exporting ? 'Preparing export…' : exported ? 'Downloaded!' : 'Download all my data'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      JSON file — clips, boards, trips &amp; wisdom
                    </p>
                  </div>
                  {!exporting && <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-400" />}
                </button>
                <p className="text-xs text-gray-400 mt-2 px-1">
                  Your data lives on this device. Export regularly to avoid data loss.
                </p>
              </section>

              {/* ── Danger zone ────────────────────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
                  Danger Zone
                </h3>
                <button
                  onClick={handleClear}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    confirmClear
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 border-gray-100 hover:bg-red-50 hover:border-red-100'
                  } group`}
                >
                  <div className={`p-2 rounded-xl shadow-sm border ${confirmClear ? 'bg-red-100 border-red-200' : 'bg-white border-gray-100'}`}>
                    {confirmClear
                      ? <AlertTriangle size={18} className="text-red-600" />
                      : <Trash2 size={18} className="text-red-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${confirmClear ? 'text-red-700' : 'text-gray-800'}`}>
                      {confirmClear ? 'Tap again to confirm — this is permanent' : 'Clear all data'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Removes all clips, boards and trips from this device
                    </p>
                  </div>
                </button>
              </section>

              {/* ── About ──────────────────────────────────────────────── */}
              <section className="text-center pt-2">
                <p className="text-xs text-gray-400">TravelPanel v1.0 · Built with Claude</p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-3 flex items-center gap-3`}>
      <div className="p-1.5 bg-white rounded-xl shadow-sm">{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
