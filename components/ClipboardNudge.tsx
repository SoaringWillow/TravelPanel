'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clipboard, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClipboardNudgeProps {
  url: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 10_000;

export default function ClipboardNudge({ url, onDismiss }: ClipboardNudgeProps) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  function handleClip() {
    onDismiss();
    router.push(`/share?url=${encodeURIComponent(url)}`);
  }

  // Show a truncated hostname for readability
  let displayUrl = url;
  try {
    displayUrl = new URL(url).hostname.replace('www.', '');
  } catch {
    // keep full URL
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="mx-4"
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clipboard size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Travel link in clipboard</p>
          <p className="text-xs text-gray-400 truncate">{displayUrl}</p>
        </div>
        <button
          type="button"
          onClick={handleClip}
          className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Clip it
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
