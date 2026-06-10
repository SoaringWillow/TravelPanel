'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';

interface LocationPermissionSheetProps {
  open: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export function LocationPermissionSheet({ open, onAllow, onDecline }: LocationPermissionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/50"
            onClick={onDecline}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-3xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onDecline}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="px-7 pt-4 pb-8 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <MapPin className="text-indigo-600" size={36} strokeWidth={1.8} />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-3">
                See spots near you
              </h2>

              <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xs mx-auto">
                TravelPanel uses your location to surface saved clips within 1 km — the hidden gems you bookmarked for exactly this moment.
                <br /><br />
                <span className="text-gray-400 text-xs">Your location is never stored or shared.</span>
              </p>

              <button
                type="button"
                onClick={onAllow}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all mb-3"
              >
                Allow location
              </button>

              <button
                type="button"
                onClick={onDecline}
                className="text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
