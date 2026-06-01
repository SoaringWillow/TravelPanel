'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface QRModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function QRModal({ url, title, onClose }: QRModalProps) {
  const [svgString, setSvgString] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const QRCode = (await import('qrcode')).default;
        const svg = await QRCode.toString(url, {
          type: 'svg',
          margin: 2,
          color: { dark: '#1e1b4b', light: '#ffffff' },
          width: 280,
        });
        if (!cancelled) setSvgString(svg);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    generate();
    return () => { cancelled = true; };
  }, [url]);

  function handleDownload() {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `travelpanel-board-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 z-[1600] bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="fixed inset-x-6 z-[1700] top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Share via QR</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
            >
              <X size={13} />
            </button>
          </div>

          {/* QR code */}
          <div className="w-full flex items-center justify-center bg-white rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
            {loading ? (
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div
                className="w-[280px] h-[280px]"
                dangerouslySetInnerHTML={{ __html: svgString }}
              />
            )}
          </div>

          {/* Caption */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Scan to add <strong>{title}</strong> to TravelPanel
          </p>

          {/* Download button */}
          {!loading && svgString && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
            >
              <Download size={13} />
              Download QR code
            </button>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
}
