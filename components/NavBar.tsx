'use client';

import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings } from 'lucide-react';

interface NavBarProps {
  active: 'home' | 'inbox' | 'boards' | 'settings';
}

const NAV_ITEMS = [
  { key: 'home',     label: 'Map',      icon: Globe2,     href: '/'         },
  { key: 'inbox',    label: 'Clips',    icon: Inbox,      href: '/inbox'    },
  { key: 'boards',   label: 'Boards',   icon: LayoutGrid, href: '/boards'   },
  { key: 'settings', label: 'Settings', icon: Settings,   href: '/settings' },
] as const;

export default function NavBar({ active }: NavBarProps) {
  return (
    <>
      {/* ── Mobile bottom nav ─── (hidden on lg) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-md"
        style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-xs mt-0.5 font-medium">{label}</span>
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

      {/* ── iPad left sidebar nav ─── (visible on lg+) */}
      <nav
        className="hidden lg:flex fixed top-0 left-0 bottom-0 z-[1000] w-20 flex-col items-center py-6 gap-1 bg-white/95 backdrop-blur-md border-r border-gray-100"
        style={{ boxShadow: '1px 0 12px rgba(0,0,0,0.06)' }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              className={`w-14 flex flex-col items-center py-3 rounded-2xl transition-colors ${
                isActive
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
