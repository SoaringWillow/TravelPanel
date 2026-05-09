'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, MapPin, Inbox } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import ContentCard from '@/components/ContentCard';
import NavBar from '@/components/NavBar';

const PLATFORMS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'xiaohongshu', label: 'Red Book' },
  { key: 'douyin', label: 'Douyin' },
  { key: 'bilibili', label: 'Bilibili' },
  { key: 'other', label: 'Web' },
];

export default function LibraryPage() {
  const { items, loading, removeItem } = useSavedItems();
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const router = useRouter();

  const filtered =
    activePlatform === 'all'
      ? items
      : items.filter((i) => i.platform === activePlatform);

  function handleViewOnMap(id: string) {
    const item = items.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      const loc = item.locations[0];
      router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${id}`);
    } else {
      router.push('/');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-4">
          <BookMarked className="text-indigo-600" size={22} />
          <h1 className="text-xl font-bold text-gray-800">My Library</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {items.length} saved
          </span>
        </div>

        {/* Platform filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {PLATFORMS.map((p) => {
            const count =
              p.key === 'all'
                ? items.length
                : items.filter((i) => i.platform === p.key).length;
            const isActive = activePlatform === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setActivePlatform(p.key)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <Inbox className="text-gray-400" size={32} />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">No items yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {activePlatform === 'all'
                ? 'Import links from WeChat, Xiaohongshu, Douyin, and more to get started.'
                : `No ${PLATFORM_LABELS[activePlatform as Platform]} items saved yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <ContentCard
                    item={item}
                    onDelete={removeItem}
                    onViewOnMap={handleViewOnMap}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <NavBar active="library" />
    </div>
  );
}
