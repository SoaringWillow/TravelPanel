'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Database, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { exportAllData, downloadJson, TravelPanelExport } from '@/lib/exportData';
import { track } from '@/lib/analytics';

export default function SettingsPage() {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [exportStats, setExportStats] = useState<TravelPanelExport['stats'] | null>(null);

  async function handleExport() {
    setExportState('loading');
    try {
      const data = await exportAllData();
      downloadJson(data);
      setExportStats(data.stats);
      setExportState('done');
      track('data_exported', data.stats);
      // Reset after 4s
      setTimeout(() => setExportState('idle'), 4000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your TravelPanel data</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 space-y-5">

        {/* Data & Backup section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Data & Backup
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">

            {/* Export My Data */}
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Download size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Export My Data</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Download all your clips, boards, and trip plans as a JSON file. Use this to back up your data or migrate to another device.
                  </p>
                </div>
              </div>

              {/* Stats if export was just run */}
              {exportState === 'done' && exportStats && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 bg-green-50 rounded-xl px-3 py-2.5 flex items-start gap-2"
                >
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-700 leading-relaxed">
                    <strong>Exported!</strong>{' '}
                    {exportStats.clipCount} clip{exportStats.clipCount !== 1 ? 's' : ''},&nbsp;
                    {exportStats.boardCount} board{exportStats.boardCount !== 1 ? 's' : ''},&nbsp;
                    {exportStats.locationCount} location{exportStats.locationCount !== 1 ? 's' : ''}, and&nbsp;
                    {exportStats.substanceCount} tip{exportStats.substanceCount !== 1 ? 's' : ''}.
                  </div>
                </motion.div>
              )}

              {exportState === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-3 bg-red-50 rounded-xl px-3 py-2 text-xs text-red-600"
                >
                  Export failed. Please try again.
                </motion.div>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={exportState === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
              >
                {exportState === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing export…
                  </>
                ) : exportState === 'done' ? (
                  <>
                    <CheckCircle2 size={16} />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download JSON
                  </>
                )}
              </button>
            </div>

            {/* What's included */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Includes all your clips (with AI-extracted tips and locations), boards, and generated trip plans. Demo content is excluded.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Limits section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Usage Limits
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <RateLimitDisplay />
          </div>
        </section>

        {/* About section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="AI Model" value="Claude (Anthropic)" />
            <InfoRow label="Storage" value="Local device (IndexedDB)" />
            <a
              href="https://github.com/SoaringWillow/TravelPanel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">Source code</span>
              <ChevronRight size={16} className="text-gray-300" />
            </a>
          </div>
        </section>

        {/* Data privacy note */}
        <div className="flex items-start gap-2 px-2">
          <Info size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            All your clips are stored locally on this device. Nothing is sent to our servers except the URLs you clip (which are sent to Claude for AI extraction). No account required.
          </p>
        </div>
      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Rate limit display ───────────────────────────────────────────────────────

function RateLimitDisplay() {
  const [limits, setLimits] = useState<{
    enrichments: { used: number; max: number; resetsAt: number };
    plans: { used: number; max: number; resetsAt: number };
  } | null>(null);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const enrichRaw = localStorage.getItem('tp_enrichment_usage');
      const planRaw   = localStorage.getItem('tp_plan_usage');

      const enrichData = enrichRaw ? JSON.parse(enrichRaw) : null;
      const planData   = planRaw   ? JSON.parse(planRaw)   : null;

      setLimits({
        enrichments: {
          used:     enrichData?.count ?? 0,
          max:      10,
          resetsAt: enrichData?.windowStart ? enrichData.windowStart + 3600000 : Date.now(),
        },
        plans: {
          used:     planData?.count ?? 0,
          max:      5,
          resetsAt: planData?.windowStart ? planData.windowStart + 86400000 : Date.now(),
        },
      });
    } catch {
      // localStorage not available
    }
  }, []);

  if (!limits) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400">
        Loading usage data…
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      <LimitRow
        label="AI extractions"
        used={limits.enrichments.used}
        max={limits.enrichments.max}
        period="per hour"
        resetsAt={limits.enrichments.resetsAt}
      />
      <LimitRow
        label="Trip plans"
        used={limits.plans.used}
        max={limits.plans.max}
        period="per day"
        resetsAt={limits.plans.resetsAt}
      />
    </div>
  );
}

function LimitRow({
  label, used, max, period, resetsAt,
}: {
  label: string;
  used: number;
  max: number;
  period: string;
  resetsAt: number;
}) {
  const pct      = Math.min(100, Math.round((used / max) * 100));
  const nearLimit = pct >= 80;
  const msLeft   = Math.max(0, resetsAt - Date.now());
  const minsLeft = Math.ceil(msLeft / 60000);
  const resetStr = minsLeft > 60
    ? `${Math.ceil(minsLeft / 60)}h`
    : minsLeft > 0 ? `${minsLeft}m` : 'soon';

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-xs font-medium ${nearLimit ? 'text-amber-600' : 'text-gray-400'}`}>
          {used} / {max} {period}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${nearLimit ? 'bg-amber-400' : 'bg-indigo-400'}`}
        />
      </div>
      {used >= max && (
        <p className="text-xs text-amber-600 mt-1">Resets in {resetStr}</p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm text-gray-400">{value}</span>
    </div>
  );
}
