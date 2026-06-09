'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';
import { getAllItems } from '@/lib/db';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weeksAgo(savedAt: number): string {
  const weeks = Math.floor((Date.now() - savedAt) / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 1) return 'recently';
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

export default function DigestPage() {
  const router = useRouter();
  const [clips, setClips] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllItems().then(items => {
      const old = items.filter(
        i => i.enrichmentStatus === 'done' && Date.now() - i.savedAt > TWO_WEEKS_MS
      );
      setClips(shuffle(old).slice(0, 6));
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-safe-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inspiration Digest</h1>
            <p className="text-xs text-gray-400 mt-0.5">Places you saved a while back</p>
          </div>
          <Sparkles size={20} className="text-indigo-400 ml-auto" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center gap-4">
            <div className="text-5xl">🗺</div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Nothing to resurface yet</p>
              <p className="text-sm text-gray-400">Save travel clips for 2+ weeks and they'll appear here.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remember these? You saved them a while back — maybe it's time to plan that trip.
            </p>
            {clips.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-36 object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-medium px-2 py-0.5 rounded-full`}>
                      {PLATFORM_LABELS[item.platform]}
                    </span>
                    <span className="text-xs text-gray-400">Saved {weeksAgo(item.savedAt)}</span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug mb-2 line-clamp-2">
                    {item.title}
                  </p>
                  {item.locations.length > 0 && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin size={11} className="text-indigo-400" />
                      {item.locations[0].name}
                      {item.locations.length > 1 && ` +${item.locations.length - 1} more`}
                    </p>
                  )}
                  {item.substance && item.substance.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 mb-3">
                      <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug line-clamp-2">
                        💡 {item.substance[0].content}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {item.boardId ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/plan/${item.boardId}`)}
                        className="flex-1 text-center text-xs font-semibold py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        Plan this trip
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="flex-1 text-center text-xs font-semibold py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        View on map
                      </button>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}

            <button
              type="button"
              onClick={() => {
                getAllItems().then(items => {
                  const old = items.filter(
                    i => i.enrichmentStatus === 'done' && Date.now() - i.savedAt > TWO_WEEKS_MS
                  );
                  setClips(shuffle(old).slice(0, 6));
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-colors"
            >
              <Sparkles size={15} />
              Shuffle inspiration
            </button>
          </>
        )}
      </div>

      <NavBar active="home" />
    </div>
  );
}
