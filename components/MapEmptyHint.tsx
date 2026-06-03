'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HAD_CLIPS_KEY = 'tp-had-clips';

interface MapEmptyHintProps {
  itemCount: number;
  loading:   boolean;
  onAddClick: () => void;
}

export default function MapEmptyHint({ itemCount, loading, onAddClick }: MapEmptyHintProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (itemCount > 0) {
      localStorage.setItem(HAD_CLIPS_KEY, '1');
      setShow(false);
    } else {
      const hadClips = localStorage.getItem(HAD_CLIPS_KEY) === '1';
      setShow(!hadClips);
    }
  }, [itemCount, loading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="map-empty-hint"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 0.4 }}
          className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-[900] pointer-events-none"
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl mb-4 select-none"
            >
              ✈️
            </motion.div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Your travel map is empty
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Save inspiration from Instagram, YouTube, 小红书 — pins appear here automatically.
            </p>
            <motion.button
              type="button"
              onClick={() => { setShow(false); onAddClick(); }}
              whileTap={{ scale: 0.96 }}
              style={{ pointerEvents: 'auto' }}
              className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg hover:bg-indigo-700 transition-colors"
            >
              Clip your first inspiration →
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
