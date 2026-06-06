'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Trash2 } from 'lucide-react';
import { getCheckinsForBoard, deleteCheckin, getBoardById } from '@/lib/db';
import { Checkin, Board } from '@/lib/types';
import NavBar from '@/components/NavBar';

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, c] = await Promise.all([
        getBoardById(boardId),
        getCheckinsForBoard(boardId),
      ]);
      setBoard(b ?? null);
      setCheckins(c);
      setLoading(false);
    }
    load();
  }, [boardId]);

  async function handleDelete(id: string) {
    await deleteCheckin(id);
    setCheckins((prev) => prev.filter((c) => c.id !== id));
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl">{board?.emoji ?? '🗺'}</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{board?.name ?? 'Timeline'}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">{checkins.length} moment{checkins.length !== 1 ? 's' : ''} collected</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {checkins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <p className="text-4xl mb-4">📸</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No moments yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
              Start your trip and check in at each activity to collect moments here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-indigo-100 dark:bg-indigo-900/40" />

            <div className="space-y-4 pl-10">
              <AnimatePresence>
                {checkins.map((checkin, idx) => (
                  <motion.div
                    key={checkin.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.04 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[2.15rem] top-3 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-950" />

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                          {checkin.locationName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {checkin.activityName}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {formatTime(checkin.checkedInAt)}
                        </p>
                        {checkin.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1">
                            {checkin.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(checkin.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
