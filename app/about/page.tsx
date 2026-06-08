'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Globe2, Mail, Github } from 'lucide-react';
import NavBar from '@/components/NavBar';

const APP_VERSION = '0.1.0';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 safe-top pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">About</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-28 space-y-6 max-w-2xl mx-auto w-full">
        {/* App identity */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl px-5 py-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
            <Globe2 size={28} />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">TravelPanel</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Version {APP_VERSION}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Clip. Organize. Plan. Go.</p>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          <LinkRow
            icon={<Mail size={18} className="text-indigo-500" />}
            label="Send feedback"
            sublabel="jiangnan027@gmail.com"
            onTap={() => { window.location.href = 'mailto:jiangnan027@gmail.com?subject=TravelPanel Feedback'; }}
          />
          <LinkRow
            icon={<Github size={18} className="text-gray-600 dark:text-gray-400" />}
            label="View source on GitHub"
            sublabel="github.com/SoaringWillow/TravelPanel"
            onTap={() => { window.open('https://github.com/SoaringWillow/TravelPanel', '_blank'); }}
          />
        </div>

        {/* Attributions */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Attributions</h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            <AttrRow name="MapLibre GL JS" detail="BSD-2-Clause — open source map rendering" />
            <AttrRow name="OpenFreeMap" detail="Open tiles, free forever" />
            <AttrRow name="Anthropic Claude" detail="AI extraction & trip planning" />
            <AttrRow name="Capacitor" detail="MIT — native iOS bridge" />
            <AttrRow name="Next.js" detail="MIT — web framework by Vercel" />
            <AttrRow name="@tanstack/react-virtual" detail="MIT — virtual scrolling" />
            <AttrRow name="Framer Motion" detail="MIT — animations" />
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-600 pb-2">
          Made with love for curious travellers.
        </p>
      </div>

      <NavBar active="boards" />
    </div>
  );
}

function LinkRow({
  icon, label, sublabel, onTap,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="w-8 flex items-center justify-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sublabel}</p>
      </div>
      <ChevronLeft size={16} className="text-gray-300 rotate-180 flex-shrink-0" />
    </button>
  );
}

function AttrRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{name}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{detail}</p>
    </div>
  );
}
