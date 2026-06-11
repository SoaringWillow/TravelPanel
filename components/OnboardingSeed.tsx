'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { hasDemoData, clearDemoData } from '@/lib/seed';

const BANNER_DISMISSED = 'travelpanel_demo_banner_dismissed';

// Banner offering a one-tap "clear & start fresh" while demo data exists.
// (Seeding itself happens app-wide in components/AppServices.tsx.)
export default function OnboardingSeed() {
  const [show, setShow] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dismissed = localStorage.getItem(BANNER_DISMISSED) === '1';
      const demo = await hasDemoData();
      if (!cancelled) setShow(demo && !dismissed);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    localStorage.setItem(BANNER_DISMISSED, '1');
    setShow(false);
  };

  const clearAll = async () => {
    setClearing(true);
    await clearDemoData();
    localStorage.setItem(BANNER_DISMISSED, '1');
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="mx-4 mt-3 mb-1 flex items-start gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
      <Sparkles size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-indigo-900">
          These are demo boards to show you around.
        </p>
        <p className="text-[11px] text-indigo-700 mt-0.5">
          Tap a clip to see the wisdom we extract — then clear them when you’re ready.
        </p>
        <div className="flex gap-3 mt-1.5">
          <button
            onClick={clearAll}
            disabled={clearing}
            className="text-[11px] font-semibold text-indigo-700 underline hover:text-indigo-900 disabled:opacity-50"
          >
            {clearing ? 'Clearing…' : 'Clear & start fresh'}
          </button>
          <button
            onClick={dismiss}
            className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700"
          >
            Keep them
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
