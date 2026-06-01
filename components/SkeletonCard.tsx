'use client';

// Shimmer skeleton that mimics InboxCard layout.
// The shimmer uses a left-to-right gradient animation for a premium feel.

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Thumbnail area */}
      <Shimmer className="w-full h-28" />

      <div className="p-2.5 space-y-2">
        {/* Platform chip */}
        <Shimmer className="h-4 w-16 rounded-full" />
        {/* Title line 1 */}
        <Shimmer className="h-3.5 w-full" />
        {/* Title line 2 */}
        <Shimmer className="h-3.5 w-3/4" />
        {/* Location */}
        <div className="flex items-center gap-1.5">
          <Shimmer className="h-3 w-3 rounded-full" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBoardCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Shimmer className="h-14 rounded-xl" />
        <Shimmer className="h-14 rounded-xl" />
        <Shimmer className="h-14 rounded-xl" />
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function BoardsSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBoardCard key={i} />
      ))}
    </div>
  );
}
