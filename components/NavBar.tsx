'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings, Navigation } from 'lucide-react';
import { getAllItems } from '@/lib/db';

interface NavBarProps {
  active: 'home' | 'inbox' | 'boards' | 'settings' | 'trip';
}

const BASE_NAV_ITEMS = [
  { key: 'home',     label: 'Map',         icon: Globe2,     href: '/'          },
  { key: 'inbox',    label: 'Inspiration', icon: Inbox,      href: '/inbox'     },
  { key: 'boards',   label: 'Collections', icon: LayoutGrid, href: '/boards'    },
  { key: 'settings', label: 'Settings',    icon: Settings,   href: '/settings'  },
] as const;

const TRIP_ITEM = { key: 'trip', label: 'Trip', icon: Navigation, href: '/trip' } as const;

export default function NavBar({ active }: NavBarProps) {
  const [hasTripBoard, setHasTripBoard] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkTrip = () => setHasTripBoard(!!localStorage.getItem('activeTripBoardId'));
    checkTrip();
    window.addEventListener('storage', checkTrip);
    return () => window.removeEventListener('storage', checkTrip);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function count() {
      try {
        const all = await getAllItems();
        if (!cancelled) {
          setPendingCount(
            all.filter((i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'processing').length
          );
        }
      } catch {}
    }
    count();
    // Refresh badge when enrichment events fire (custom event dispatched by the retry queue)
    const refresh = () => count();
    window.addEventListener('enrichment-updated', refresh);
    return () => { cancelled = true; window.removeEventListener('enrichment-updated', refresh); };
  }, []);

  const items = hasTripBoard
    ? [BASE_NAV_ITEMS[0], BASE_NAV_ITEMS[1], TRIP_ITEM, BASE_NAV_ITEMS[2], BASE_NAV_ITEMS[3]]
    : [...BASE_NAV_ITEMS];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800"
      style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-stretch">
        {items.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          const showBadge = key === 'inbox' && pendingCount > 0;
          return (
            <Link
              key={key}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{label}</span>
              <span
                className={`mt-0.5 rounded-full transition-all duration-200 ${
                  isActive ? 'w-1 h-1 bg-indigo-600 dark:bg-indigo-400' : 'w-0 h-1 bg-transparent'
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
