'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings } from 'lucide-react';
import { cloudEnabled, getSession, onAuthChange } from '@/lib/supabase';

interface NavBarProps {
  active: 'home' | 'inbox' | 'boards' | 'settings';
}

const NAV_ITEMS = [
  { key: 'home',     label: 'Map',         icon: Globe2,     href: '/'          },
  { key: 'inbox',    label: 'Inspiration', icon: Inbox,      href: '/inbox'     },
  { key: 'boards',   label: 'Collections', icon: LayoutGrid, href: '/boards'    },
  { key: 'settings', label: 'Settings',    icon: Settings,   href: '/settings'  },
] as const;

// Colours for the sync dot: grey=offline/not-signed-in, green=synced, orange=syncing, red=error
type SyncDot = 'grey' | 'green' | 'orange' | 'red';

const SYNC_DOT_COLORS: Record<SyncDot, string> = {
  grey:   'bg-gray-300 dark:bg-gray-600',
  green:  'bg-green-500',
  orange: 'bg-amber-500',
  red:    'bg-red-500',
};

export default function NavBar({ active }: NavBarProps) {
  const [syncDot, setSyncDot] = useState<SyncDot>('grey');

  useEffect(() => {
    if (!cloudEnabled) return;

    // Check initial session
    getSession().then((s) => {
      setSyncDot(s ? 'green' : 'grey');
    });

    // Update dot when auth changes
    let unsub = () => {};
    onAuthChange((s) => {
      setSyncDot(s ? 'green' : 'grey');
    }).then((fn) => { unsub = fn; });

    return () => unsub();
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
      style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          const isSettings = key === 'settings';
          return (
            <Link
              key={key}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {/* Sync status dot on settings icon when cloud is enabled */}
                {isSettings && cloudEnabled && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${SYNC_DOT_COLORS[syncDot]} border border-white dark:border-gray-900`} />
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{label}</span>
              {/* Active indicator dot */}
              <span
                className={`mt-0.5 rounded-full transition-all duration-200 ${
                  isActive ? 'w-1 h-1 bg-indigo-600' : 'w-0 h-1 bg-transparent'
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
