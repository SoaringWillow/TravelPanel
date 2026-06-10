'use client';

import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings2 } from 'lucide-react';

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
    <>
      {/* Bottom nav — phones only */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-transparent dark:border-gray-800"
        style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
                <span className="text-xs mt-0.5 font-medium" aria-hidden="true">{label}</span>
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

      {/* Side nav — iPad / desktop */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-[1000] w-16 flex-col items-center pt-10 pb-6 gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-100 dark:border-gray-800"
        style={{ boxShadow: '1px 0 12px rgba(0,0,0,0.06)' }}
      >
        {/* Logo dot */}
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center mb-4 flex-shrink-0">
          <Globe2 size={16} className="text-white" aria-hidden="true" />
        </div>

        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              title={label}
              className={`flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
              <span className="text-[9px] font-medium leading-none" aria-hidden="true">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
