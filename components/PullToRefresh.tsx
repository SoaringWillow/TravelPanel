'use client';

import { useState, useRef, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 64;  // px of pull needed to trigger refresh
const MAX_PULL = 80;        // px cap on pull distance (rubber-band effect)

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const progress = Math.min(pullDist / PULL_THRESHOLD, 1);
  const triggered = pullDist >= PULL_THRESHOLD;

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    pulling.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (refreshing) return;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop > 2) return; // not at the top of the scroll container

    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0) return;

    pulling.current = true;
    // Rubber-band: taper off as user pulls further
    const rubber = Math.min(delta * 0.55, MAX_PULL);
    setPullDist(rubber);
  }

  async function onTouchEnd() {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDist >= PULL_THRESHOLD) {
      setRefreshing(true);
      // Settle indicator at a fixed height while refreshing
      setPullDist(PULL_THRESHOLD * 0.65);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDist(0);
      }
    } else {
      setPullDist(0);
    }
  }

  const indicatorHeight = refreshing
    ? PULL_THRESHOLD * 0.65
    : pullDist;

  return (
    <div className={`relative flex flex-col min-h-0 ${className}`}>
      {/* Pull indicator */}
      <div
        className="overflow-hidden flex items-end justify-center"
        style={{
          height: indicatorHeight,
          transition: (pulling.current) ? 'none' : 'height 0.3s ease',
        }}
      >
        <div
          className="mb-2 text-indigo-500"
          style={{
            transform: refreshing ? 'none' : `rotate(${progress * 240}deg)`,
            opacity: progress,
            transition: 'opacity 0.15s',
          }}
        >
          <RefreshCw
            size={20}
            className={refreshing ? 'animate-spin' : ''}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          transform: (pullDist > 0 && !refreshing) ? `translateY(${pullDist * 0.12}px)` : 'none',
          transition: pulling.current ? 'none' : 'transform 0.3s ease',
          // Hint to browser that this is the primary scroll container
          overscrollBehaviorY: 'contain',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      {/* Triggered flash ring */}
      {triggered && !refreshing && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-100 animate-ping pointer-events-none" />
      )}
    </div>
  );
}
