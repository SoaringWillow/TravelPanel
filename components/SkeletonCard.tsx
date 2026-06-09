'use client';

// Animated shimmer skeleton that matches InboxCard dimensions.
// Shown during the first load of the inbox and board detail pages.

export default function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      {/* Thumbnail area */}
      <div className="w-full h-32 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 skeleton-shimmer" />

      <div className="p-3 space-y-2">
        {/* Platform badge */}
        <div className="h-4 w-20 rounded-full bg-gray-100 skeleton-shimmer" />
        {/* Title line 1 */}
        <div className="h-3.5 w-full rounded bg-gray-100 skeleton-shimmer" />
        {/* Title line 2 (shorter) */}
        <div className="h-3.5 w-2/3 rounded bg-gray-100 skeleton-shimmer" />
        {/* Location chip */}
        <div className="h-3 w-24 rounded bg-gray-100 skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
