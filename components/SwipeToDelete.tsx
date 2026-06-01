'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  /** Pixels of left-swipe needed to reveal the delete zone. Default 72. */
  threshold?: number;
}

export default function SwipeToDelete({ children, onDelete, threshold = 72 }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const startXRef = useRef<number | null>(null);
  const dragging  = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    dragging.current  = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0 && !dragging.current) { setOffset(0); return; }
    dragging.current = true;
    setOffset(Math.max(dx, -threshold - 16)); // allow slight over-drag
  }

  function onTouchEnd() {
    if (offset <= -threshold) {
      setConfirming(true);
      setOffset(-threshold);
    } else {
      setOffset(0);
    }
    startXRef.current = null;
  }

  function handleDelete() {
    setOffset(-300); // slide out
    setTimeout(onDelete, 200);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete zone behind the card */}
      <div
        className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center rounded-2xl"
        style={{ width: threshold }}
      >
        <Trash2 size={20} className="text-white" />
      </div>

      {/* Card (slides left on swipe) */}
      <div
        style={{
          transform:  `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease',
          position:   'relative',
          zIndex:     1,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      {/* Confirmation overlay */}
      {confirming && (
        <div
          className="absolute inset-0 bg-black/40 rounded-2xl z-10 flex items-center justify-center gap-3"
          onClick={() => { setConfirming(false); setOffset(0); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(false); setOffset(0); }}
            className="bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl shadow"
          >
            Keep
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(false); handleDelete(); }}
            className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
