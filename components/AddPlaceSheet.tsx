'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Loader2, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { saveItem } from '@/lib/db';
import { impact } from '@/lib/haptics';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

interface AddPlaceSheetProps {
  open: boolean;
  onClose: () => void;
  onAdded: (item: SavedItem) => void;
}

function typeLabel(type: string, cls: string): string {
  if (cls === 'tourism') return 'Tourist spot';
  if (cls === 'amenity') return type.replace(/_/g, ' ');
  if (cls === 'natural') return type.replace(/_/g, ' ');
  if (cls === 'place') return type;
  return type.replace(/_/g, ' ');
}

export default function AddPlaceSheet({ open, onClose, onAdded }: AddPlaceSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=7&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'TravelPanel/1.0' },
        });
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          setResults(data);
        }
      } catch {
        // Network error — silent
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  async function handleSelect(result: NominatimResult) {
    setAdding(result.place_id);
    impact('medium');

    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0].trim();
    const address = result.display_name;

    const now = Date.now();
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: `https://nominatim.openstreetmap.org/place/${result.place_id}`,
      platform: 'other',
      title: name,
      description: result.display_name,
      locations: [{ lat, lng, name, address }],
      activities: [],
      tags: [result.class, result.type].filter(Boolean).filter((t) => t !== 'yes'),
      substance: [],
      savedAt: now,
      enrichmentStatus: 'done',
      retryCount: 0,
    };

    await saveItem(item);
    impact('medium');
    onAdded(item);
    setAdding(null);
    setQuery('');
    setResults([]);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1900] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
            style={{ maxHeight: '80vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Add a place</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a place, landmark, city…"
                  className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-3 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
                />
                {loading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
                )}
                {query && !loading && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto pb-10" style={{ maxHeight: 'calc(80vh - 150px)' }}>
              {results.length === 0 && query.trim().length >= 2 && !loading && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  No places found for "{query}"
                </div>
              )}
              {results.length === 0 && query.trim().length < 2 && (
                <div className="px-5 py-8 text-center">
                  <MapPin size={32} className="text-indigo-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Type to search for any place worldwide</p>
                </div>
              )}
              {results.map((r) => {
                const name = r.display_name.split(',')[0].trim();
                const rest = r.display_name.split(',').slice(1).join(',').trim();
                const label = typeLabel(r.type, r.class);
                return (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    disabled={adding === r.place_id}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center flex-shrink-0">
                      {adding === r.place_id
                        ? <Loader2 size={16} className="text-indigo-500 animate-spin" />
                        : <MapPin size={16} className="text-indigo-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{rest}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {label}
                    </span>
                    <Plus size={16} className="text-indigo-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
