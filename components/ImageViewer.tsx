'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

export function ImageViewer({ src, alt = '', caption, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const lastTap = useRef(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-120, 0, 120], [0, 1, 0]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pinch-to-zoom via touch events
  const lastPinchDist = useRef<number | null>(null);
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist / lastPinchDist.current;
        setScale((s) => Math.min(4, Math.max(1, s * delta)));
      }
      lastPinchDist.current = dist;
    }
  }
  function onTouchEnd() {
    lastPinchDist.current = null;
  }

  // Double-tap to toggle zoom
  function onTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setScale((s) => (s > 1 ? 1 : 2.5));
    }
    lastTap.current = now;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        style={{ top: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}
      >
        <X size={20} />
      </button>

      {/* Swipe-down-to-dismiss draggable container */}
      <motion.div
        drag={scale === 1 ? 'y' : false}
        dragConstraints={{ top: -150, bottom: 150 }}
        dragElastic={0.3}
        style={{ y, opacity }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.y) > 100) onClose();
        }}
        className="relative w-full h-full flex items-center justify-center"
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onTap}
      >
        <motion.img
          src={src}
          alt={alt}
          animate={{ scale }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="max-w-full max-h-full object-contain select-none"
          style={{ touchAction: scale > 1 ? 'auto' : 'none' }}
          draggable={false}
        />
      </motion.div>

      {/* Caption */}
      {caption && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm text-center"
          style={{ paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' }}
        >
          {caption}
        </div>
      )}
    </motion.div>
  );
}

/** Wrap a thumbnail img so tapping it opens the full-screen viewer */
export function ZoomableThumbnail({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in ${className ?? ''}`}
        onClick={() => setOpen(true)}
        draggable={false}
      />
      <AnimatePresence>
        {open && (
          <ImageViewer src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
