'use client';

'use client';

import Link from 'next/link';
import { Globe2, Inbox, LayoutGrid, Settings, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface NavBarProps {
  active: 'home' | 'inbox' | 'boards' | 'settings';
}

const NAV_ITEMS = [
  { key: 'home',     label: 'Map',         icon: Globe2,     href: '/'         },
  { key: 'inbox',    label: 'Inspiration', icon: Inbox,      href: '/inbox'    },
  { key: 'boards',   label: 'Collections', icon: LayoutGrid, href: '/boards'   },
  { key: 'settings', label: 'Settings',    icon: Settings,   href: '/settings' },
] as const;

export default function NavBar({ active }: NavBarProps) {
  const { isOnline, justReconnected } = useNetworkStatus();

  return (
    <>
      {/* Offline / reconnected snackbar — appears just above the nav */}
      <AnimatePresence>
        {(!isOnline || justReconnected) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[68px] left-4 right-4 z-[999]"
          >
            <div
              className={`rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg text-sm font-medium ${
                isOnline
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-900 text-white'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse flex-shrink-0" />
                  Back online — clips will sync
                </>
              ) : (
                <>
                  <WifiOff size={14} className="flex-shrink-0" />
                  You&apos;re offline — clips will enrich when reconnected
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-md safe-bottom"
        style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center py-2 transition-colors relative ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {/* Offline dot indicator on the active nav item */}
                  {!isOnline && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
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
    </>
  );
}
