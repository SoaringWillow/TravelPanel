'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, ArrowLeft, Share2 } from 'lucide-react';
import { getItem } from '@/lib/db';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

export default function CardPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [copied, setCopied]  = useState(false);

  useEffect(() => {
    if (itemId) {
      getItem(itemId).then((i) => {
        if (i) setItem(i);
      });
    }
  }, [itemId]);

  async function handleShare() {
    const url  = `${window.location.origin}/card/${itemId}`;
    const text = item ? `${item.title} — via TravelPanel` : 'Check this out on TravelPanel';

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const topSubstance = (item.substance ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Back bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-white dark:bg-gray-900 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Share2 size={15} />
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mt-4 bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden"
      >
        {/* Hero / thumbnail */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-48 object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 flex items-center justify-center">
            <span className="text-5xl">✈️</span>
          </div>
        )}

        <div className="p-5">
          {/* Platform badge + title */}
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-3`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-3">
            {item.title}
          </h1>

          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              {item.description}
            </p>
          )}

          {/* Locations */}
          {item.locations.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Locations
              </p>
              <div className="space-y-1.5">
                {item.locations.slice(0, 4).map((loc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <MapPin size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{loc.name}</span>
                  </div>
                ))}
                {item.locations.length > 4 && (
                  <p className="text-xs text-gray-400 pl-5">+{item.locations.length - 4} more</p>
                )}
              </div>
            </div>
          )}

          {/* Top wisdom */}
          {topSubstance.length > 0 && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-3.5 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                💡 Tips from this clip
              </p>
              {topSubstance.map((s, i) => (
                <p key={i} className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                  • {typeof s === 'string' ? s : (s as { tip?: string; text?: string }).tip ?? (s as { tip?: string; text?: string }).text ?? String(s)}
                </p>
              ))}
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.map((t) => (
                <span key={t} className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Source link */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            <ExternalLink size={14} />
            View original source
          </a>
        </div>
      </motion.div>

      {/* TravelPanel branding */}
      <div className="flex flex-col items-center py-8 gap-2">
        <p className="text-xs text-gray-400">Saved with</p>
        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">✈️ TravelPanel</p>
        <p className="text-xs text-gray-400">Save travel inspiration from anywhere</p>
      </div>
    </div>
  );
}
