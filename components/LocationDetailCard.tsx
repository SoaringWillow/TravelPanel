'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { X, MapPin, Share2, Globe, Pencil, Plus, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';
import { impact } from '@/lib/haptics';
import { saveItem } from '@/lib/db';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [0, 180], [1, 0]);
  const [imgError, setImgError] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(item.notes ?? '');

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  async function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== item.title) {
      await saveItem({ ...item, title: trimmed });
      impact('light');
    } else {
      setTitleValue(item.title);
    }
  }

  // Editable tags
  const [tags, setTags] = useState<string[]>(item.tags);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');

  async function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await saveItem({ ...item, tags: next });
    impact('light');
  }

  async function commitTagInput() {
    const raw = tagInput.trim();
    if (!raw) { setAddingTag(false); setTagInput(''); return; }
    const newTags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    const merged = Array.from(new Set([...tags, ...newTags]));
    setTags(merged);
    await saveItem({ ...item, tags: merged });
    setTagInput('');
    setAddingTag(false);
    impact('light');
  }

  async function saveNote() {
    setEditingNote(false);
    const trimmed = noteValue.trim();
    if (trimmed !== (item.notes ?? '')) {
      await saveItem({ ...item, notes: trimmed || undefined });
    }
  }

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 700) {
      impact('light');
      await animate(dragY, 400, { duration: 0.2, ease: 'easeIn' });
      onClose();
    } else {
      animate(dragY, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  const [shareSuccess, setShareSuccess] = useState(false);

  async function handleShare() {
    if (typeof navigator === 'undefined') return;

    const firstTip = item.substance?.find((s) => s.type === 'tip' || s.type === 'recommendation');
    const shareText = firstTip
      ? `${firstTip.content}\n\nSaved with TravelPanel`
      : 'Saved with TravelPanel';

    // Real share URL: skip geo:/text:// synthetic URLs — just share the text
    const hasRealUrl = item.url && !item.url.startsWith('geo:') && !item.url.startsWith('text://');

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: shareText,
          ...(hasRealUrl ? { url: item.url } : {}),
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
        impact('light');
      } else {
        const clip = [item.title, shareText, hasRealUrl ? item.url : ''].filter(Boolean).join('\n\n');
        await navigator.clipboard.writeText(clip);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
        impact('light');
      }
    } catch {
      // share cancelled or clipboard denied
    }
  }

  const showHero = item.thumbnail && !imgError;

  return (
    <>
      {/* Backdrop — tap to close */}
      <motion.div
        className="fixed inset-0 z-[1400] bg-black/20"
        style={{ opacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <motion.div
        style={{ y: dragY }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.15 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20 cursor-grab active:cursor-grabbing"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">

          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-0 flex-shrink-0">
            <div className="w-9 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Hero image */}
          {showHero && (
            <div className="flex-shrink-0 relative overflow-hidden" style={{ height: 160 }}>
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
              {/* Gradient fade to white */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/70" />
            </div>
          )}

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className={`flex items-start justify-between px-4 pb-2 flex-shrink-0 ${showHero ? 'pt-2' : 'pt-3'}`}>
            <div className="flex-1 min-w-0 pr-3">
              {!showHero && (
                <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}>
                  {PLATFORM_LABELS[item.platform]}
                </span>
              )}
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                    if (e.key === 'Escape') { setTitleValue(item.title); setEditingTitle(false); }
                  }}
                  className="font-bold text-gray-800 text-base leading-snug w-full border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingTitle(true); }}
                  className="font-bold text-gray-800 text-base leading-snug line-clamp-2 text-left w-full hover:text-indigo-700 transition-colors"
                  aria-label="Tap to edit title"
                >
                  {titleValue}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={handleShare}
                className={`p-2 rounded-full transition-colors ${shareSuccess ? 'bg-green-50' : 'hover:bg-gray-100'}`}
                aria-label={shareSuccess ? 'Copied!' : 'Share'}>
                {shareSuccess
                  ? <Check size={17} className="text-green-500" />
                  : <Share2 size={17} className="text-gray-500" />}
              </button>
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Open original">
                <Globe size={17} className="text-gray-500" />
              </a>
              <button type="button" onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-5 space-y-3">
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            )}

            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Locations</p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-gray-700 font-medium block">{loc.name}</span>
                        {loc.address && <span className="text-xs text-gray-400 block">{loc.address}</span>}
                        <span className="text-xs text-gray-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Activities</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <SubstanceList items={item.substance ?? []} />

            {/* Editable tags */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                    className="text-gray-400 hover:text-red-400 transition-colors leading-none"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {addingTag ? (
                <span className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                  <input
                    autoFocus
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onBlur={commitTagInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitTagInput(); }
                      if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); }
                    }}
                    placeholder="tag, tag…"
                    className="text-xs text-indigo-700 outline-none bg-transparent w-20 placeholder-indigo-300"
                  />
                  <button type="button" onClick={commitTagInput} aria-label="Save tags" className="text-indigo-500 hover:text-indigo-700">
                    <Check size={11} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-indigo-500 border border-dashed border-gray-300 hover:border-indigo-300 px-2 py-0.5 rounded-full transition-colors"
                  aria-label="Add tag"
                >
                  <Plus size={11} />
                  tag
                </button>
              )}
            </div>

            {/* Editable personal note */}
            <div className="rounded-xl border border-dashed border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">My Note</p>
                <button
                  type="button"
                  onClick={() => setEditingNote(true)}
                  aria-label="Edit note"
                  className="p-1 text-gray-300 hover:text-indigo-400 transition-colors rounded-md"
                >
                  <Pencil size={12} />
                </button>
              </div>
              {editingNote ? (
                <textarea
                  autoFocus
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onBlur={saveNote}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } if (e.key === 'Escape') { setNoteValue(item.notes ?? ''); setEditingNote(false); } }}
                  rows={3}
                  placeholder="Add a personal note…"
                  className="w-full px-3 pb-2.5 text-sm text-gray-700 placeholder-gray-300 resize-none outline-none bg-transparent"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingNote(true)}
                  className="w-full text-left px-3 pb-2.5 text-sm leading-relaxed"
                >
                  {noteValue ? (
                    <span className="text-gray-700">{noteValue}</span>
                  ) : (
                    <span className="text-gray-300">Add a personal note…</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
