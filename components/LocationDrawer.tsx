'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { Location, SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_BG, PLATFORM_LABELS } from '@/lib/parse-url';

interface LocationDrawerProps {
  location: Location;
  items: SavedItem[];
  onClose: () => void;
}

function substanceForLocation(items: SavedItem[], locationName: string): Array<{ sub: SubstanceItem; clip: SavedItem }> {
  const nameLower = locationName.toLowerCase();
  const results: Array<{ sub: SubstanceItem; clip: SavedItem }> = [];

  for (const item of items) {
    const hasLocation = item.locations.some(
      (l) => l.name.toLowerCase() === nameLower
    );
    if (!hasLocation) continue;
    for (const sub of item.substance ?? []) {
      results.push({ sub, clip: item });
    }
  }

  return results;
}

export default function LocationDrawer({ location, items, onClose }: LocationDrawerProps) {
  const router = useRouter();

  const nameLower = location.name.toLowerCase();
  const matchingItems = items.filter((item) =>
    item.locations.some((l) => l.name.toLowerCase() === nameLower)
  );

  const allSubstance = substanceForLocation(items, location.name);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400] bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl"
        style={{ maxHeight: '70vh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin size={14} className="text-indigo-500 flex-shrink-0" />
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight line-clamp-1">
                {location.name}
              </h3>
            </div>
            {location.address && (
              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 pl-5">
                {location.address}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-24" style={{ maxHeight: 'calc(70vh - 90px)' }}>

          {/* From your clips */}
          {matchingItems.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                From your clips ({matchingItems.length})
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {matchingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/?itemId=${item.id}&flyTo=${location.lat},${location.lng}`);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2 max-w-[200px] hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0">
                      <span
                        className={`${PLATFORM_BG[item.platform]} text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full`}
                      >
                        {PLATFORM_LABELS[item.platform]}
                      </span>
                      <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-1 mt-0.5 font-medium">
                        {item.title}
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 dark:text-gray-500 flex-shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Substance tips */}
          {allSubstance.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                Tips for this spot ({allSubstance.length})
              </p>
              <div className="space-y-2">
                {allSubstance.map(({ sub, clip }, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{sub.content}</p>
                    {sub.applies_to && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{sub.applies_to}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic line-clamp-1">
                      From: {clip.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No specific tips yet — add more clips about this place
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
