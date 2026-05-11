'use client';

import Link from 'next/link';
import { Globe2, BookMarked, Route } from 'lucide-react';

interface NavBarProps {
  active: 'home' | 'library' | 'plan';
}

const NAV_ITEMS = [
  { key: 'home', label: 'Map', icon: Globe2, href: '/' },
  { key: 'library', label: 'Library', icon: BookMarked, href: '/library' },
  { key: 'plan', label: 'Plan', icon: Route, href: '/plan' },
] as const;

export default function NavBar({ active }: NavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around px-2 pb-safe">
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-6 py-3 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon
                size={22}
                className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
