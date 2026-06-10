'use client';

import { useState, useEffect } from 'react';
import { Download, Cloud, CloudOff, Info, CheckCircle2, Sparkles, Check, X, FolderInput } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';
import { ProBadge } from '@/components/ProBadge';

// ─── Export helpers ───────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadJSON(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('proWaitlistEmail');
      if (stored) { setWaitlistEmail(stored); setWaitlistJoined(true); }
    }
  }, []);

  function handleJoinWaitlist() {
    if (!waitlistEmail.includes('@')) return;
    localStorage.setItem('proWaitlistEmail', waitlistEmail);
    setWaitlistJoined(true);
  }

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()])
      .then(([i, b]) => { setItems(i); setBoards(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const [allItems, allBoards] = await Promise.all([getAllItems(), getAllBoards()]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        stats: {
          clips: allItems.length,
          boards: allBoards.length,
        },
        boards: allBoards,
        clips: allItems,
      };
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(exportData, `travelpanel-backup-${date}.json`);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  const clipsCount = items.filter((i) => !i.isDemo).length;
  const boardsCount = boards.filter((b) => !b.isDemo).length;

  const estimatedSize = (() => {
    try {
      return formatBytes(new TextEncoder().encode(JSON.stringify({ boards, clips: items })).length);
    } catch {
      return '—';
    }
  })();

  const supabaseConfigured =
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Data stats */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-transparent dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Data</p>
          </div>

          {loading ? (
            <div className="px-4 py-4 text-sm text-gray-400 animate-pulse">Loading…</div>
          ) : (
            <div className="px-4 py-4 space-y-4">
              {/* Stats row */}
              <div className="flex gap-4">
                <div className="flex-1 bg-indigo-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{clipsCount}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Clips</p>
                </div>
                <div className="flex-1 bg-indigo-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{boardsCount}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Boards</p>
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting || clipsCount + boardsCount === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50
                  bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]"
              >
                {exported ? (
                  <>
                    <CheckCircle2 size={16} />
                    Downloaded!
                  </>
                ) : exporting ? (
                  <>
                    <Download size={16} className="animate-bounce" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download all data
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                JSON file · ~{estimatedSize} · includes all clips, boards, extracted locations &amp; wisdom
              </p>

              {/* Import button */}
              <button
                type="button"
                onClick={() => router.push('/import')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
              >
                <FolderInput size={16} />
                Import from Google Maps or Bookmarks
              </button>
            </div>
          )}
        </div>

        {/* Cloud sync */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-transparent dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cloud Sync</p>
          </div>
          <div className="px-4 py-4 flex items-start gap-3">
            {supabaseConfigured ? (
              <Cloud size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <CloudOff size={20} className="text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">
                {supabaseConfigured ? 'Connected' : 'Not connected'}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {supabaseConfigured
                  ? 'Your clips sync to the cloud automatically.'
                  : 'Sync across devices and protect against data loss. Add Supabase credentials to enable — see B1 in TASKS.md.'}
              </p>
            </div>
          </div>
        </div>

        {/* Browser extension */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-transparent dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Browser Extension</p>
          </div>
          <div className="px-4 py-4 flex items-start gap-3">
            <Info size={20} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">Clip from any web page</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Load the <strong>browser-extension/</strong> folder in Chrome (Developer Mode → Load Unpacked)
                to add a one-click clip button to your browser toolbar.
              </p>
            </div>
          </div>
        </div>

        {/* Pro Upgrade */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          {/* Gradient header */}
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-4 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-amber-300" />
              <span className="text-white font-bold text-base">Upgrade to Pro</span>
              <ProBadge />
            </div>
            <p className="text-indigo-200 text-xs leading-relaxed">
              Unlimited clips, vibe search, cloud sync, and priority AI processing.
            </p>
          </div>

          {/* Comparison table */}
          <div className="bg-white">
            <div className="grid grid-cols-3 border-b border-gray-100 px-4 py-2">
              <span className="text-xs font-semibold text-gray-500 col-span-1">Feature</span>
              <span className="text-xs font-semibold text-gray-500 text-center">Free</span>
              <span className="text-xs font-bold text-indigo-600 text-center flex items-center justify-center gap-1">
                Pro <ProBadge size="xs" />
              </span>
            </div>
            {[
              { label: 'Clips',           free: '50',        pro: 'Unlimited' },
              { label: 'Boards',          free: '3',         pro: 'Unlimited' },
              { label: 'Plans / day',     free: '2',         pro: 'Unlimited' },
              { label: 'Cloud sync',      free: false,       pro: true },
              { label: 'Vibe search',     free: false,       pro: true },
              { label: 'Priority AI',     free: false,       pro: true },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-700 col-span-1">{row.label}</span>
                <div className="flex justify-center">
                  {typeof row.free === 'boolean' ? (
                    row.free ? <Check size={14} className="text-green-500" /> : <X size={13} className="text-gray-300" />
                  ) : (
                    <span className="text-xs text-gray-500">{row.free}</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {typeof row.pro === 'boolean' ? (
                    row.pro ? <Check size={14} className="text-indigo-500" /> : <X size={13} className="text-gray-300" />
                  ) : (
                    <span className="text-xs font-semibold text-indigo-600">{row.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Waitlist form */}
          <div className="bg-white px-4 pb-4 pt-2 border-t border-gray-100">
            {waitlistJoined ? (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">You're on the waitlist!</p>
                  <p className="text-xs text-green-600">{waitlistEmail}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Join the waitlist — be the first to know when Pro launches.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinWaitlist()}
                    placeholder="your@email.com"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    disabled={!waitlistEmail.includes('@')}
                    className="bg-indigo-600 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-transparent dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">About</p>
          </div>
          <div className="px-4 py-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-gray-400">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="text-gray-400">IndexedDB (device-local)</span>
            </div>
            <div className="flex justify-between">
              <span>AI model</span>
              <span className="text-gray-400">Claude (Anthropic)</span>
            </div>
            <div className="flex justify-between">
              <span>Privacy Policy</span>
              <a href="/privacy" className="text-indigo-500 hover:underline">View</a>
            </div>
          </div>
        </div>

      </div>

      <NavBar active="settings" />
    </div>
  );
}
