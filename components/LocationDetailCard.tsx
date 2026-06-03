'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { saveItem } from '@/lib/db';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdated?: (updated: SavedItem) => void;
}

function openInMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  if (isIOS) {
    window.open(`maps://?ll=${lat},${lng}&q=${label}`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  }
}

export default function LocationDetailCard({ item: initialItem, onClose, onUpdated }: LocationDetailCardProps) {
  const [item, setItem]     = useState(initialItem);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [draftNotes, setDraftNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updated: SavedItem = {
      ...item,
      title: draftTitle.trim() || item.title,
      notes: draftNotes.trim() || undefined,
    };
    await saveItem(updated);
    setItem(updated);
    onUpdated?.(updated);
    setEditing(false);
    setSaving(false);
  }

  function handleStartEdit() {
    setDraftTitle(item.title);
    setDraftNotes(item.notes ?? '');
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  return (
    <>
      {/* Invisible backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={editing ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              <AnimatePresence mode="wait" initial={false}>
                {editing ? (
                  <motion.input
                    key="title-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full font-bold text-gray-800 dark:text-gray-100 text-base leading-snug bg-gray-50 dark:bg-gray-800 border border-indigo-300 dark:border-indigo-600 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                ) : (
                  <motion.h3
                    key="title-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-gray-800 dark:text-gray-100 text-base leading-snug line-clamp-2"
                  >
                    {item.title}
                  </motion.h3>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                    aria-label="Cancel edit"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                    aria-label="Save"
                  >
                    <Check size={17} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-indigo-500"
                    aria-label="Edit clip"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-gray-400 block">{loc.address}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openInMaps(loc.lat, loc.lng, loc.name)}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 transition-colors"
                        aria-label={`Open ${loc.name} in Maps`}
                        title="Open in Maps"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance */}
            <SubstanceList items={item.substance ?? []} />

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — editable */}
            <div>
              {editing ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Add your own notes…"
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-indigo-300 dark:border-indigo-600 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              ) : item.notes ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Notes</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{item.notes}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
