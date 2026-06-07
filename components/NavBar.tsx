'use client';

import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings2 } from 'lucide-react';
import { impact } from '@/lib/haptics';

interface NavBarProps {
  active: 'home' | 'inbox' | 'boards' | 'settings';
}

const NAV_ITEMS = [
  { key: 'home',     label: 'Map',         icon: Globe2,     href: '/'         },
  { key: 'inbox',    label: 'Inspiration', icon: Inbox,      href: '/inbox'    },
  { key: 'boards',   label: 'Collections', icon: LayoutGrid, href: '/boards'   },
  { key: 'settings', label: 'Settings',    icon: Settings2,  href: '/settings' },
] as const;

export default function NavBar({ active }: NavBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              onClick={() => { if (!isActive) impact('light'); }}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                isActive ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
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
