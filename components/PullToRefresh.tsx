'use client';
import { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export default function PullToRefresh({ onRefresh, children, className = '', threshold = 72 }: PullToRefreshProps) {
  const [pullY, setPullY]         = useState(0); // how far user has pulled (0–threshold)
  const [refreshing, setRefreshing] = useState(false);
  const startYRef  = useRef<number | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) { setPullY(0); return; }
    // resist pull with sqrt damping
    setPullY(Math.min(Math.sqrt(delta) * 5, threshold));
  }, [refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;

    if (pullY >= threshold) {
      setRefreshing(true);
      setPullY(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }, [pullY, threshold, onRefresh]);

  const indicatorVisible = pullY > 0 || refreshing;

  return (
    <div className="relative overflow-hidden flex-1 flex flex-col">
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        style={{
          height:     indicatorVisible ? Math.max(pullY, refreshing ? threshold * 0.7 : 0) : 0,
          transition: startYRef.current ? 'none' : 'height 0.25s ease',
          overflow:   'hidden',
          display:    'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 8,
        }}
      >
        {indicatorVisible && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Loader2 size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : pullY >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${className}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
