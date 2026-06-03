'use client';

import { useState, useEffect } from 'react';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { SavedItem, Board, Trip } from '@/lib/types';

// Simple client-side password gate — not server-enforced, but sufficient for
// an internal-only admin view on a personal/small-team app.
const ADMIN_TOKEN = 'tp-admin-2026';

interface AdminStats {
  totalItems: number;
  enrichedItems: number;
  failedItems: number;
  totalBoards: number;
  totalTrips: number;
  totalLocations: number;
  totalSubstance: number;
  topDomains: { domain: string; count: number }[];
  enrichmentsThisHour: number;
  enrichmentsTotal: number;
  plansToday: number;
  plansTotal: number;
  estimatedEnrichCostUsd: number;
  estimatedPlanCostUsd: number;
}

function readLocalLog(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).timestamps ?? [] : [];
  } catch { return []; }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return 'unknown'; }
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput]   = useState('');
  const [error, setError]   = useState('');
  const [stats, setStats]   = useState<AdminStats | null>(null);

  // Check if already authed in session
  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === '1') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const load = async () => {
      const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);

      const now = Date.now();
      const hourCutoff  = now - 3600_000;
      const dayCutoff   = now - 86400_000;
      const enrichLog   = readLocalLog('enrichmentLog');
      const planLog     = readLocalLog('planLog');

      // Domain frequency
      const domainMap = new Map<string, number>();
      for (const item of items) {
        if (!item.isDemo && item.url) {
          const d = extractDomain(item.url);
          domainMap.set(d, (domainMap.get(d) ?? 0) + 1);
        }
      }
      const topDomains = [...domainMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([domain, count]) => ({ domain, count }));

      // Claude Haiku costs (approximate as of 2025)
      // Input: $0.80/M tokens, Output: $4/M tokens
      // Avg enrichment: ~1500 input + 400 output tokens
      const enrichTotal = enrichLog.length;
      const enrichCostPerCall = (1500 * 0.0000008) + (400 * 0.000004);
      const estimatedEnrichCostUsd = enrichTotal * enrichCostPerCall;

      // Claude Opus for plans: ~8000 input + 2000 output tokens (streaming)
      // Input: $15/M, Output: $75/M
      const planTotal = planLog.length;
      const planCostPerCall = (8000 * 0.000015) + (2000 * 0.000075);
      const estimatedPlanCostUsd = planTotal * planCostPerCall;

      setStats({
        totalItems:      items.filter(i => !i.isDemo).length,
        enrichedItems:   items.filter(i => i.enrichmentStatus === 'done' && !i.isDemo).length,
        failedItems:     items.filter(i => i.enrichmentStatus === 'failed' && !i.isDemo).length,
        totalBoards:     boards.filter(b => !b.isDemo).length,
        totalTrips:      trips.length,
        totalLocations:  items.reduce((s, i) => s + (i.locations?.length ?? 0), 0),
        totalSubstance:  items.reduce((s, i) => s + (i.substance?.length ?? 0), 0),
        topDomains,
        enrichmentsThisHour: enrichLog.filter(t => t > hourCutoff).length,
        enrichmentsTotal:    enrichTotal,
        plansToday:          planLog.filter(t => t > dayCutoff).length,
        plansTotal:          planTotal,
        estimatedEnrichCostUsd,
        estimatedPlanCostUsd,
      });
    };
    load().catch(() => {});
  }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-xs space-y-4">
          <h1 className="text-white text-lg font-bold text-center">Admin Access</h1>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (input === ADMIN_TOKEN) {
                  sessionStorage.setItem('admin_authed', '1');
                  setAuthed(true);
                } else {
                  setError('Wrong password');
                }
              }
            }}
            placeholder="Password"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            onClick={() => {
              if (input === ADMIN_TOKEN) {
                sessionStorage.setItem('admin_authed', '1');
                setAuthed(true);
              } else {
                setError('Wrong password');
              }
            }}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const enrichSuccessRate = stats.totalItems > 0
    ? Math.round((stats.enrichedItems / stats.totalItems) * 100)
    : 0;
  const totalCostUsd = stats.estimatedEnrichCostUsd + stats.estimatedPlanCostUsd;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 pb-12">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">TravelPanel Admin</h1>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>

        {/* Library stats */}
        <Section title="Library">
          <Grid>
            <Cell label="Total clips"   value={stats.totalItems} />
            <Cell label="Enriched"      value={stats.enrichedItems} />
            <Cell label="Failed"        value={stats.failedItems}   danger={stats.failedItems > 5} />
            <Cell label="Success rate"  value={`${enrichSuccessRate}%`} />
            <Cell label="Boards"        value={stats.totalBoards} />
            <Cell label="Trips"         value={stats.totalTrips} />
            <Cell label="Locations"     value={stats.totalLocations} />
            <Cell label="Substance tips" value={stats.totalSubstance} />
          </Grid>
        </Section>

        {/* API usage */}
        <Section title="API Usage (this device)">
          <Grid>
            <Cell label="Enrichments this hour" value={stats.enrichmentsThisHour} />
            <Cell label="Enrichments total"     value={stats.enrichmentsTotal} />
            <Cell label="Plans today"            value={stats.plansToday} />
            <Cell label="Plans total"            value={stats.plansTotal} />
          </Grid>
        </Section>

        {/* Cost estimate */}
        <Section title="Estimated API Cost">
          <Grid>
            <Cell label="Enrichment cost" value={`$${stats.estimatedEnrichCostUsd.toFixed(3)}`} />
            <Cell label="Plan cost"       value={`$${stats.estimatedPlanCostUsd.toFixed(3)}`} />
            <Cell label="Total estimate"  value={`$${totalCostUsd.toFixed(3)}`} highlight />
          </Grid>
          <p className="text-xs text-gray-500 mt-2">
            Based on Haiku for enrichment (~$0.002/call) and Opus for plans (~$0.27/call). Approximate.
          </p>
        </Section>

        {/* Top domains */}
        {stats.topDomains.length > 0 && (
          <Section title="Top Clipped Domains">
            <div className="space-y-2">
              {stats.topDomains.map(({ domain, count }) => (
                <div key={domain} className="flex items-center gap-3">
                  <div
                    className="h-1.5 bg-indigo-500 rounded-full"
                    style={{ width: `${Math.round((count / stats.topDomains[0].count) * 120)}px`, minWidth: 8 }}
                  />
                  <span className="text-sm text-gray-300 flex-1">{domain}</span>
                  <span className="text-sm font-semibold text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-white/10 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Cell({ label, value, danger, highlight }: { label: string; value: string | number; danger?: boolean; highlight?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-xl px-3 py-2.5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${danger ? 'text-red-400' : highlight ? 'text-indigo-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
