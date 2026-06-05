'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Database, Info, CheckCircle2, XCircle, Zap, ExternalLink } from 'lucide-react';
import { getAllItems, getAllBoards, getTripsForBoard } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';
import { checkEnrichmentLimit, checkPlanLimit, formatResetsIn } from '@/lib/rateLimits';
import NavBar from '@/components/NavBar';

interface ExportData {
  version: string;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

interface Stats {
  items: number;
  boards: number;
  trips: number;
  locations: number;
  substanceItems: number;
}

interface UsageRow {
  remaining: number;
  resetsAt: number;
  used: number;
  total: number;
}

interface Usage {
  enrich: UsageRow;
  plan: UsageRow;
}

export default function SettingsPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [usage, setUsage]         = useState<Usage | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      const trips = tripArrays.flat();
      setStats({
        items: items.filter((i) => !i.isDemo).length,
        boards: boards.filter((b) => !b.isDemo).length,
        trips: trips.length,
        locations: items.reduce((n, i) => n + (i.locations?.length ?? 0), 0),
        substanceItems: items.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
      });

      const enrichLim = checkEnrichmentLimit();
      const planLim   = checkPlanLimit();
      setUsage({
        enrich: { remaining: enrichLim.remaining, resetsAt: enrichLim.resetsAt, used: 10 - enrichLim.remaining, total: 10 },
        plan:   { remaining: planLim.remaining,   resetsAt: planLim.resetsAt,   used: 5  - planLim.remaining,  total: 5  },
      });
    };
    load().catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
      const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
      const trips = tripArrays.flat();

      const payload: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        items,
        boards,
        trips,
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `travelpanel-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('[TravelPanel] Export failed', err);
    } finally {
      setExporting(false);
    }
  }

  const envStatus = {
    ai:      !!process.env.NEXT_PUBLIC_ANTHROPIC_KEY_CONFIGURED,
    posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
      </header>

      <div className="px-4 py-5 space-y-4">

        {/* ── Data & Backup ── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Data &amp; Backup</h2>
            </div>
          </div>

          {/* Stats */}
          {stats !== null && (
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
              {[
                { label: 'Clips',    value: stats.items },
                { label: 'Boards',   value: stats.boards },
                { label: 'Pins',     value: stats.locations },
              ].map(({ label, value }) => (
                <div key={label} className="py-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Wisdom stat row */}
          {stats !== null && stats.substanceItems > 0 && (
            <div className="px-5 py-3 bg-indigo-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm text-indigo-700 font-medium">
                {stats.substanceItems} wisdom items extracted
              </span>
              <span className="text-xs text-indigo-400">tips · warnings · opinions</span>
            </div>
          )}

          {/* Export button */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 mb-3">
              Download a complete backup of your clips, boards, and itineraries as JSON.
              Import it back or open it in any text editor.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            >
              {exported ? (
                <CheckCircle2 size={16} />
              ) : (
                <Download size={16} className={exporting ? 'animate-bounce' : ''} />
              )}
              {exported ? 'Downloaded!' : exporting ? 'Preparing…' : 'Export all data'}
            </button>
          </div>
        </section>

        {/* ── Configuration status ── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Configuration</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: 'AI extraction (Anthropic)',  ok: true,                    note: 'Active'                  },
              { label: 'Analytics (PostHog)',         ok: envStatus.posthog,       note: envStatus.posthog ? 'Active' : 'Add NEXT_PUBLIC_POSTHOG_KEY' },
              { label: 'Cloud sync (Supabase)',       ok: envStatus.supabase,      note: envStatus.supabase ? 'Active' : 'Add NEXT_PUBLIC_SUPABASE_URL'  },
            ].map(({ label, ok, note }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                </div>
                {ok
                  ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  : <XCircle     size={18} className="text-gray-300 flex-shrink-0" />
                }
              </div>
            ))}
          </div>
        </section>

        {/* ── Usage limits ── */}
        {usage && (
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Usage Limits</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {([
                { label: 'AI enrichment', sublabel: 'per hour', row: usage.enrich },
                { label: 'Trip planning', sublabel: 'per day',  row: usage.plan   },
              ] as const).map(({ label, sublabel, row }) => {
                const pct = row.total > 0 ? (row.used / row.total) * 100 : 0;
                const isExhausted = row.remaining === 0;
                return (
                  <div key={label} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{sublabel}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${isExhausted ? 'text-red-500' : 'text-gray-700'}`}>
                        {row.remaining}/{row.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isExhausted ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {row.used > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {isExhausted ? 'Limit reached — ' : ''}Resets in {formatResetsIn(row.resetsAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── About ── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm text-gray-400">1.0.0</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm text-gray-400">On-device (IndexedDB)</span>
            </div>
            <a
              href="https://github.com/SoaringWillow/TravelPanel/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-600">Send feedback</span>
              <div className="flex items-center gap-1.5 text-indigo-500">
                <span className="text-xs">GitHub Issues</span>
                <ExternalLink size={13} />
              </div>
            </a>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-50">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" />
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">Danger Zone</h2>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 mb-3">
              Permanently delete all clips, boards, and itineraries from this device.
              This cannot be undone — export a backup first.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Delete ALL data? This cannot be undone.')) {
                  indexedDB.deleteDatabase('travel-panel');
                  window.location.href = '/';
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 size={16} />
              Clear all data
            </button>
          </div>
        </section>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
