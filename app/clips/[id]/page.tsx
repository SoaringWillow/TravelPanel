'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, MapPin, Trash2, Globe, Edit2, Check, X } from 'lucide-react';
import { getItemById, saveItem, deleteItem } from '@/lib/db';
import { SavedItem, SubstanceType } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { feedback } from '@/lib/haptics';
import { track } from '@/lib/analytics';

const SUBSTANCE_ICONS: Record<SubstanceType, string> = {
  tip: '💡',
  warning: '⚠️',
  opinion: '🗣',
  wisdom: '🧠',
  context: 'ℹ️',
  recommendation: '⭐',
};

const SUBSTANCE_COLORS: Record<SubstanceType, string> = {
  tip: 'text-amber-700 bg-amber-50',
  warning: 'text-red-700 bg-red-50',
  opinion: 'text-violet-700 bg-violet-50',
  wisdom: 'text-blue-700 bg-blue-50',
  context: 'text-gray-600 bg-gray-50',
  recommendation: 'text-emerald-700 bg-emerald-50',
};

export default function ClipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'spots' | 'tips' | 'details'>('spots');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getItemById(id).then((i) => {
      setItem(i ?? null);
      if (i) {
        setTitleDraft(i.title);
        setNotesDraft(i.notes ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  async function saveTitle() {
    if (!item || !titleDraft.trim()) return;
    const updated = { ...item, title: titleDraft.trim() };
    await saveItem(updated);
    setItem(updated);
    setEditingTitle(false);
    feedback('light');
  }

  async function saveNotes() {
    if (!item) return;
    const updated = { ...item, notes: notesDraft };
    await saveItem(updated);
    setItem(updated);
    setEditingNotes(false);
    feedback('light');
  }

  async function handleDelete() {
    if (!item) return;
    setDeleting(true);
    feedback('warning');
    await deleteItem(item.id);
    track('clip_deleted', { from: 'detail_view' });
    router.back();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 mb-4">Clip not found.</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const hasSpots = item.locations.length > 0;
  const hasTips = (item.substance?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-white pb-10">
      {/* Thumbnail / Header */}
      <div className="relative">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
            <Globe size={40} className="text-indigo-200" />
          </div>
        )}
        {/* Back button overlay */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl"
        >
          <ArrowLeft size={18} />
        </button>
        {/* Delete button overlay */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-12 right-4 p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {/* Platform badge */}
        <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-3`}>
          {PLATFORM_LABELS[item.platform]}
        </span>

        {/* Title */}
        {editingTitle ? (
          <div className="flex items-start gap-2 mb-3">
            <textarea
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="flex-1 text-lg font-bold text-gray-900 border-b-2 border-indigo-400 outline-none resize-none bg-transparent"
              rows={2}
              autoFocus
            />
            <div className="flex flex-col gap-1 pt-1">
              <button onClick={saveTitle} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
                <Check size={16} />
              </button>
              <button onClick={() => { setTitleDraft(item.title); setEditingTitle(false); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 mb-3 group">
            <h1 className="flex-1 text-xl font-bold text-gray-900 leading-tight">{item.title}</h1>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}

        {/* Source URL */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-4"
        >
          <ExternalLink size={13} />
          View original
        </a>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {([
            { key: 'spots', label: `📍 ${item.locations.length} Spots` },
            { key: 'tips',  label: `💡 ${item.substance?.length ?? 0} Tips` },
            { key: 'details', label: '📋 Details' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
                activeTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Spots */}
        {activeTab === 'spots' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!hasSpots ? (
              <p className="text-sm text-gray-400 text-center py-8">No locations extracted yet.</p>
            ) : (
              <div className="space-y-3">
                {item.locations.map((loc, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3">
                    <MapPin size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{loc.name}</p>
                      {loc.address && <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>}
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                    </div>
                    <a
                      href={`/?flyTo=${loc.lat},${loc.lng}&itemId=${item.id}`}
                      className="ml-auto text-xs text-indigo-600 font-medium hover:underline flex-shrink-0"
                    >
                      Map
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Tips */}
        {activeTab === 'tips' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!hasTips ? (
              <p className="text-sm text-gray-400 text-center py-8">No tips extracted from this clip.</p>
            ) : (
              <div className="space-y-3">
                {item.substance!.map((s, i) => (
                  <div key={i} className={`rounded-2xl p-4 ${SUBSTANCE_COLORS[s.type]}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{SUBSTANCE_ICONS[s.type]}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        {s.type}
                      </span>
                      {s.applies_to && (
                        <span className="text-xs bg-white/50 rounded-full px-2 py-0.5 font-medium ml-auto">
                          re: {s.applies_to}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{s.content}</p>
                    {s.source_quote && (
                      <p className="text-xs mt-2 opacity-60 italic">"{s.source_quote}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Details */}
        {activeTab === 'details' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Tags */}
            {item.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activities</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal notes</p>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Add your own notes…"
                    className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={saveNotes} className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                      Save
                    </button>
                    <button onClick={() => { setNotesDraft(item.notes ?? ''); setEditingNotes(false); }} className="px-4 text-gray-500 text-sm hover:bg-gray-100 rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="w-full text-left bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-gray-700 transition-colors"
                >
                  {item.notes || 'Tap to add personal notes…'}
                </button>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Saved</span>
                <span className="text-gray-600 font-medium">{new Date(item.savedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-600 font-medium capitalize">{item.enrichmentStatus}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
