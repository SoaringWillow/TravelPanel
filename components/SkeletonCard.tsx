'use client';

/** Shimmer placeholder card matching InboxCard dimensions. */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      {/* Thumbnail placeholder */}
      <div className="w-full h-28 animate-shimmer" />
      <div className="p-3 space-y-2">
        {/* Platform chip */}
        <div className="w-16 h-4 rounded-full animate-shimmer" />
        {/* Title */}
        <div className="w-full h-3.5 rounded animate-shimmer" />
        <div className="w-3/4 h-3.5 rounded animate-shimmer" />
        {/* Tag row */}
        <div className="flex gap-1.5 pt-1">
          <div className="w-10 h-3 rounded-full animate-shimmer" />
          <div className="w-12 h-3 rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

/** Full-width skeleton for timeline entries. */
export function SkeletonTimelineEntry() {
  return (
    <div className="relative flex gap-4 pl-2 mb-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div className="w-3 h-3 rounded-full animate-shimmer mt-3" />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      {/* Card */}
      <div className="flex-1 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
        <div className="w-full h-32 animate-shimmer" />
        <div className="p-3.5 space-y-2">
          <div className="flex justify-between">
            <div className="w-20 h-4 rounded-full animate-shimmer" />
            <div className="w-16 h-4 rounded animate-shimmer" />
          </div>
          <div className="w-full h-4 rounded animate-shimmer" />
          <div className="w-2/3 h-4 rounded animate-shimmer" />
          <div className="w-1/2 h-3 rounded animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

/** Board card skeleton. */
export function SkeletonBoardCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm aspect-square">
      <div className="w-full h-1/2 animate-shimmer" />
      <div className="p-3 space-y-2">
        <div className="w-8 h-8 rounded-xl animate-shimmer" />
        <div className="w-3/4 h-4 rounded animate-shimmer" />
        <div className="w-1/2 h-3 rounded animate-shimmer" />
      </div>
    </div>
  );
}
