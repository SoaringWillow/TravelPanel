'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Database, Shield, Globe2, ChevronRight, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJSON } from '@/lib/exportData';
import { track } from '@/lib/analytics';

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export default function SettingsPage() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportSummary, setExportSummary] = useState<{ items: number; boards: number; trips: number } | null>(null);

  async function handleExport() {
    setExportState('exporting');
    try {
      const data = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `travelpanel-backup-${date}.json`);
      setExportSummary(data.counts);
      setExportState('done');
      track('data_exported', data.counts);
      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 safe-top">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Data & Backup section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Data &amp; Backup
          </p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">

            {/* Export JSON */}
            <button
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                exportState === 'done' ? 'bg-green-100' : 'bg-indigo-100'
              }`}>
                {exportState === 'done' ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : exportState === 'exporting' ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <Download size={20} className="text-indigo-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">
                  {exportState === 'done' ? 'Export complete!' : 'Export all data'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {exportState === 'done' && exportSummary
                    ? `${exportSummary.items} clips · ${exportSummary.boards} boards · ${exportSummary.trips} plans downloaded`
                    : exportState === 'exporting'
                    ? 'Reading your clips and boards…'
                    : 'Download all clips, boards, and plans as JSON'}
                </div>
              </div>
              {exportState === 'idle' && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
            </button>

            {/* Export error */}
            {exportState === 'error' && (
              <div className="px-4 py-3 bg-red-50">
                <p className="text-sm text-red-600">Export failed. Please try again.</p>
              </div>
            )}

            {/* Storage info */}
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Database size={20} className="text-gray-500" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Local storage</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  All data is stored on this device using IndexedDB
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Cloud sync section — dormant until Supabase keys */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Cloud Sync
          </p>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Globe2 size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Sync across devices</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Sign in to sync your clips and plans across iPhone, iPad, and the web
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">
                Soon
              </span>
            </div>
          </div>
        </section>

        {/* About section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Shield size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Privacy</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Your data stays on your device. AI extraction uses the Anthropic API over HTTPS.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500">Version</span>
              <span className="text-sm font-medium text-gray-700">1.0.0</span>
            </div>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
