'use client';

import { useRef, useState, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 64; // px of pull needed to trigger

export default function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [pullY, setPullY]         = useState(0);     // current drag distance (clamped)
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return; // only trigger at very top
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) { startYRef.current = null; return; }
    // Damped drag: slows at threshold (rubber-band feel)
    setPullY(Math.min(dy * 0.5, THRESHOLD + 12));
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;

    if (pullY >= THRESHOLD * 0.5 && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD * 0.5); // snap to spinner height
      try { await onRefresh(); } catch { /* ignore */ }
      setRefreshing(false);
    }
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / (THRESHOLD * 0.5), 1);
  const showIndicator = pullY > 4 || refreshing;

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            right:           0,
            zIndex:          20,
            display:         'flex',
            justifyContent:  'center',
            paddingTop:      8,
            height:          pullY || (refreshing ? 40 : 0),
            transition:      refreshing ? 'none' : 'height 0.2s ease',
            pointerEvents:   'none',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{
              opacity:   progress,
              transform: `rotate(${refreshing ? 0 : progress * 180}deg)`,
              animation: refreshing ? 'ptr-spin 0.7s linear infinite' : 'none',
              transition: 'opacity 0.15s',
            }}
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${progress * 50} 65`} />
          </svg>
          <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Scrollable content — shifts down while pulling */}
      <div
        ref={containerRef}
        className={className}
        style={{ transform: `translateY(${pullY}px)`, transition: pullY === 0 ? 'transform 0.25s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
