'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 64; // px pull needed to trigger refresh

export default function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const startYRef       = useRef<number | null>(null);
  const [pullY, setPullY]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (refreshing || startYRef.current === null) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) { startYRef.current = null; return; }

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Dampen the pull so it feels springy
      setPullY(Math.min(delta * 0.45, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (refreshing || startYRef.current === null) return;
    startYRef.current = null;

    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      try {
        await onRefresh();
        setLastRefreshed(new Date());
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullY(0);
    }
  }, [refreshing, pullY, onRefresh]);

  const indicatorOpacity = Math.min(pullY / THRESHOLD, 1);
  const indicatorScale   = 0.6 + indicatorOpacity * 0.4;

  return (
    <div className="relative flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end z-10 pointer-events-none"
        style={{
          top: 0,
          height: refreshing ? 48 : pullY,
          opacity: refreshing ? 1 : indicatorOpacity,
          transition: pullY === 0 ? 'height 0.25s ease, opacity 0.25s ease' : undefined,
        }}
      >
        <div
          style={{ transform: `scale(${refreshing ? 1 : indicatorScale})`, marginBottom: 8 }}
          className="transition-transform"
        >
          <Loader2
            size={22}
            className={`text-indigo-500 ${refreshing ? 'animate-spin' : ''}`}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto ${className}`}
        style={{ transform: pullY > 0 ? `translateY(${pullY}px)` : undefined, transition: pullY === 0 ? 'transform 0.25s ease' : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Last refreshed timestamp — shown at top when available */}
        {lastRefreshed && (
          <div className="text-center text-xs text-gray-400 pt-1 pb-0">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
