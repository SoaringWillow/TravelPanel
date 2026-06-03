'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { X, MapPin, Trash2, Share2, ExternalLink, BookOpen, Lightbulb, AlertTriangle, Star, Info, ThumbsUp } from 'lucide-react';
import { SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Substance type → icon + label ──────────────────────────────────────────

const SUBSTANCE_META: Record<SubstanceItem['type'], { icon: React.ReactNode; label: string; color: string }> = {
  tip:            { icon: <Lightbulb size={12} />,      label: 'Tip',            color: 'text-amber-600 bg-amber-50' },
  warning:        { icon: <AlertTriangle size={12} />,  label: 'Warning',        color: 'text-red-600 bg-red-50' },
  opinion:        { icon: <ThumbsUp size={12} />,       label: 'Opinion',        color: 'text-purple-600 bg-purple-50' },
  wisdom:         { icon: <Star size={12} />,           label: 'Wisdom',         color: 'text-indigo-600 bg-indigo-50' },
  context:        { icon: <Info size={12} />,           label: 'Context',        color: 'text-blue-600 bg-blue-50' },
  recommendation: { icon: <BookOpen size={12} />,       label: 'Recommendation', color: 'text-teal-600 bg-teal-50' },
};

interface ClipDetailSheetProps {
  item: SavedItem;
  onClose: () => void;
  onViewOnMap?: () => void;
  onDelete?: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClipDetailSheet({ item, onClose, onViewOnMap, onDelete }: ClipDetailSheetProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  }, [onClose]);

  async function handleShare() {
    const text = `${item.title}\n${item.url}`;
    if (navigator.share) {
      await navigator.share({ title: item.title, url: item.url, text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  // Group substance by type
  const substanceByType = (item.substance ?? []).reduce<Record<string, SubstanceItem[]>>((acc, s) => {
    (acc[s.type] ??= []).push(s);
    return acc;
  }, {});
  const substanceTypes = Object.keys(substanceByType) as SubstanceItem['type'][];

  const platformColor = PLATFORM_COLORS[item.platform];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] flex flex-col bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '92vh', height: '92vh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div ref={dragHandleRef} className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Hero thumbnail */}
        {item.thumbnail && (
          <div className="relative flex-shrink-0 h-48 overflow-hidden">
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.closest('div')!.style.display = 'none'; }}
            />
            {/* Platform badge overlay */}
            <span
              className="absolute top-3 left-3 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: platformColor }}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/60 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title + platform (when no thumbnail) */}
          <div className="px-4 pt-4 pb-3">
            {!item.thumbnail && (
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`${PLATFORM_BG[item.platform]} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{item.title}</h2>
            {item.description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">{item.description}</p>
            )}
          </div>

          {/* Locations */}
          {item.locations.length > 0 && (
            <section className="px-4 pb-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                📍 Locations
              </h3>
              <div className="space-y-2">
                {item.locations.map((loc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <MapPin size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{loc.name}</p>
                      {loc.address && (
                        <p className="text-xs text-gray-400 truncate">{loc.address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Substance — grouped by type */}
          {substanceTypes.length > 0 && (
            <section className="px-4 pb-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                💡 Insights
              </h3>
              <div className="space-y-3">
                {substanceTypes.map((type) => {
                  const meta = SUBSTANCE_META[type] ?? SUBSTANCE_META.tip;
                  return (
                    <div key={type}>
                      <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                      </div>
                      <div className="space-y-1.5">
                        {substanceByType[type].map((s, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl px-3 py-2">
                            <p className="text-sm text-gray-700 leading-snug">{s.content}</p>
                            {s.applies_to && (
                              <p className="text-xs text-gray-400 mt-0.5 italic">{s.applies_to}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Activities */}
          {item.activities.length > 0 && (
            <section className="px-4 pb-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activities</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.activities.map((a) => (
                  <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <section className="px-4 pb-4 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {item.notes && (
            <section className="px-4 pb-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🗒 Notes</h3>
              <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
              </div>
            </section>
          )}

          {/* Spacer for action bar */}
          <div className="h-24" />
        </div>

        {/* Action bar — fixed to bottom of sheet */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-safe flex gap-2">
          {onViewOnMap && item.locations.length > 0 && (
            <button
              type="button"
              onClick={onViewOnMap}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              <MapPin size={15} />
              Map
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Share2 size={15} />
            Share
          </button>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <ExternalLink size={15} />
              Open
            </a>
          )}

          {onDelete && (
            !deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="px-3 flex items-center justify-center border border-red-100 text-red-500 py-3 rounded-xl hover:bg-red-50 transition-colors"
                aria-label="Delete clip"
              >
                <Trash2 size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onDelete(item.id); onClose(); }}
                className="px-3 flex items-center justify-center bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-colors text-xs font-semibold"
              >
                Confirm
              </button>
            )
          )}
        </div>
      </motion.div>
    </>
  );
}
