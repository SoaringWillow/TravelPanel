'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 70; // px pulled before triggering

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullY, setPullY]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef    = useRef<number | null>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setPullY(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh().catch(() => {});
      setRefreshing(false);
    }
    setPullY(0);
    startYRef.current = null;
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', flex: 1 }}>
      {/* Pull indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: refreshing ? THRESHOLD : pullY,
          transition: refreshing || pullY > 0 ? 'none' : 'height 0.2s ease',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {(pullY > 10 || refreshing) && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: progress,
            }}
          >
            <RefreshCw
              size={16}
              className="text-indigo-600"
              style={{
                transform: `rotate(${refreshing ? 0 : progress * 360}deg)`,
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={className}
        style={{ transform: `translateY(${pullY}px)`, transition: pullY > 0 ? 'none' : 'transform 0.2s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
