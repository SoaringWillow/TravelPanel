import React from 'react';

export function SkeletonCard({ variant = 'inbox' }: { variant?: 'inbox' | 'board' }) {
  if (variant === 'board') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-3 min-h-[100px] overflow-hidden">
        <div className="shimmer h-10 w-10 rounded-xl mb-2" />
        <div className="shimmer h-3.5 w-3/4 rounded mb-1.5" />
        <div className="shimmer h-3 w-1/2 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Thumbnail area */}
      <div className="shimmer h-28 w-full" />
      {/* Content */}
      <div className="p-2.5 space-y-1.5">
        <div className="shimmer h-3 w-5/6 rounded" />
        <div className="shimmer h-3 w-3/4 rounded" />
        <div className="shimmer h-2.5 w-1/2 rounded mt-2" />
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} variant="inbox" />
      ))}
    </div>
  );
}

export function BoardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} variant="board" />
      ))}
    </div>
  );
}
