'use client';

// ─── Enrichment limit: 10 per hour ───────────────────────────────────────────

const ENRICH_LIMIT = 10;
const ENRICH_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ENRICH_KEY = 'enrichmentLog';

interface TimestampLog {
  timestamps: number[];
}

function readLog(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimestampLog;
    return parsed.timestamps ?? [];
  } catch {
    return [];
  }
}

function writeLog(key: string, timestamps: number[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamps }));
  } catch {
    // Storage full — ignore
  }
}

export function checkEnrichmentLimit(): { allowed: boolean; remaining: number; resetsAt: number } {
  const now = Date.now();
  const cutoff = now - ENRICH_WINDOW_MS;
  const log = readLog(ENRICH_KEY).filter((t) => t > cutoff);
  const allowed = log.length < ENRICH_LIMIT;
  const oldest = log[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, ENRICH_LIMIT - log.length),
    resetsAt: oldest + ENRICH_WINDOW_MS,
  };
}

export function recordEnrichment(): void {
  const now = Date.now();
  const cutoff = now - ENRICH_WINDOW_MS;
  const log = readLog(ENRICH_KEY).filter((t) => t > cutoff);
  writeLog(ENRICH_KEY, [...log, now]);
}

// ─── Plan limit: 5 per day ────────────────────────────────────────────────────

const PLAN_LIMIT = 5;
const PLAN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const PLAN_KEY = 'planLog';

export function checkPlanLimit(): { allowed: boolean; remaining: number; resetsAt: number } {
  const now = Date.now();
  const cutoff = now - PLAN_WINDOW_MS;
  const log = readLog(PLAN_KEY).filter((t) => t > cutoff);
  const allowed = log.length < PLAN_LIMIT;
  const oldest = log[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, PLAN_LIMIT - log.length),
    resetsAt: oldest + PLAN_WINDOW_MS,
  };
}

export function recordPlanGeneration(): void {
  const now = Date.now();
  const cutoff = now - PLAN_WINDOW_MS;
  const log = readLog(PLAN_KEY).filter((t) => t > cutoff);
  writeLog(PLAN_KEY, [...log, now]);
}

export function formatResetsIn(resetsAt: number): string {
  const diff = Math.max(0, resetsAt - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
