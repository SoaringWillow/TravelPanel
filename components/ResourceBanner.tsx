'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface ResourceItem {
  key: string;
  label: string;
  why: string;
  howToGet: string;
  tier: 'free' | 'paid';
}

// Resources the app needs but may not have yet.
// Add entries here when a new integration requires a key.
const REQUIRED_RESOURCES: ResourceItem[] = [
  {
    key: 'NEXT_PUBLIC_POSTHOG_KEY',
    label: 'PostHog Analytics',
    why: 'Needed to track clips/plans and measure the North Star metric (weekly clips per active user).',
    howToGet: 'Free at posthog.com — create a project and copy the project API key.',
    tier: 'free',
  },
  {
    key: 'RESEND_API_KEY',
    label: 'Resend Email',
    why: 'Enables email notifications when the app needs attention (resource requests, errors).',
    howToGet: 'Free tier at resend.com — 100 emails/day. Create an account and generate an API key.',
    tier: 'free',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    label: 'Supabase (Cloud Sync)',
    why: 'Phase B: auth, multi-device sync, cloud backup, embedding search.',
    howToGet: 'Free tier at supabase.com — create a project and copy the project URL + anon key.',
    tier: 'free',
  },
];

export function ResourceBanner() {
  const [missing, setMissing] = useState<ResourceItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notifying, setNotifying] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Only run in dev or when explicitly enabled — don't distract production users
    if (process.env.NODE_ENV === 'production') return;

    const dismissedKeys = JSON.parse(localStorage.getItem('dismissedResourceBanners') ?? '[]') as string[];
    setDismissed(new Set(dismissedKeys));

    // Check which keys are missing (client-side check for NEXT_PUBLIC_ keys)
    const missingItems = REQUIRED_RESOURCES.filter(r => {
      if (dismissedKeys.includes(r.key)) return false;
      if (r.key.startsWith('NEXT_PUBLIC_')) {
        return !process.env[r.key];
      }
      return false; // Server-side keys can't be checked here
    });

    setMissing(missingItems);
  }, []);

  const dismiss = (key: string) => {
    const next = new Set([...Array.from(dismissed), key]);
    setDismissed(next);
    localStorage.setItem('dismissedResourceBanners', JSON.stringify(Array.from(next)));
    setMissing(prev => prev.filter(r => r.key !== key));
  };

  const notifyOwner = async (item: ResourceItem) => {
    setNotifying(item.key);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'api_key',
          resourceName: item.key,
          subject: `[TravelPanel] ${item.label} API key needed`,
          message: `${item.why}\n\nHow to get it: ${item.howToGet}\n\nAdd as environment variable: ${item.key}`,
        }),
      });
      const data = await res.json();

      if (data.method === 'mailto' && data.mailto) {
        window.open(data.mailto, '_blank');
      } else {
        showToast(`Request sent for ${item.label} setup`, 'success');
      }
    } catch {
      // Silently fail
    } finally {
      setNotifying(null);
    }
  };

  if (missing.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {missing.map(item => (
        <div
          key={item.key}
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-lg flex gap-3"
        >
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">{item.label} not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">{item.why}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => notifyOwner(item)}
                disabled={notifying === item.key}
                className="text-xs text-amber-800 underline flex items-center gap-1 hover:text-amber-900"
              >
                {notifying === item.key ? 'Sending...' : 'Email me setup instructions'}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          <button
            onClick={() => dismiss(item.key)}
            className="text-amber-400 hover:text-amber-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
