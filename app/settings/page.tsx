'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, AlertTriangle, Database, Puzzle, ExternalLink } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAndDownload } from '@/lib/exportData';

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportCounts, setExportCounts] = useState<{ items: number; boards: number; trips: number } | null>(null);

  async function handleExport() {
    if (exportState === 'exporting') return;
    setExportState('exporting');
    try {
      const { counts } = await exportAndDownload();
      setExportCounts(counts);
      setExportState('done');
    } catch {
      setExportState('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── Data & Backup ────────────────────────────────────────────────── */}
        <SectionHeader icon={Database} title="Data &amp; Backup" />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-800">Download all my data</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Exports all saved clips, boards, and trip plans as a single JSON file.
              Use this for backups or migrating to a new device.
            </p>
          </div>

          <div className="px-5 py-4">
            <motion.button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${
                exportState === 'done'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : exportState === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } disabled:opacity-60`}
            >
              {exportState === 'exporting' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Preparing export…
                </>
              ) : exportState === 'done' ? (
                <>
                  <CheckCircle2 size={16} />
                  Downloaded!
                </>
              ) : exportState === 'error' ? (
                <>
                  <AlertTriangle size={16} />
                  Export failed — try again
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download JSON backup
                </>
              )}
            </motion.button>

            {exportState === 'done' && exportCounts && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-center text-gray-400 mt-2"
              >
                {exportCounts.items} clips · {exportCounts.boards} boards · {exportCounts.trips} plans
              </motion.p>
            )}
          </div>

          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Your data is stored locally on this device. Cloud sync activates automatically
              when Supabase credentials are added — no action needed until then.
            </p>
          </div>
        </div>

        {/* ── Browser Extension ───────────────────────────────────────────── */}
        <SectionHeader icon={Puzzle} title="Browser Extension" />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-gray-800">TravelPanel Clipper</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Clip any travel page from Chrome or Edge with one click.
              Load the extension from the <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">browser-extension/</code> folder
              in the project repository.
            </p>
          </div>

          <div className="px-5 pb-4 space-y-2">
            <SetupStep n={1} text='Open chrome://extensions and enable Developer mode' />
            <SetupStep n={2} text='Click "Load unpacked" → select the browser-extension/ folder' />
            <SetupStep n={3} text='Open the extension settings and enter this app's URL' />
          </div>
        </div>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">TravelPanel</p>
              <p className="text-xs text-gray-400 mt-0.5">Travel inspiration clipper + AI trip planner</p>
            </div>
            <span className="text-xs font-mono text-gray-300 bg-gray-50 border border-gray-100 px-2 py-1 rounded">v0.2</span>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.FC<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-2">
      <Icon size={13} className="text-gray-400" />
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider"
        dangerouslySetInnerHTML={{ __html: title }}
      />
    </div>
  );
}

function SetupStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}
