'use client';

// Shimmer skeleton components for loading states.
// Match the visual shape of InboxCard and BoardCard.

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 rounded ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      {/* Platform badge + title row */}
      <div className="flex items-start gap-3">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Shimmer className="h-3.5 w-3/4 rounded-full" />
          <Shimmer className="h-3 w-1/2 rounded-full" />
        </div>
      </div>
      {/* Tags row */}
      <div className="flex gap-2">
        <Shimmer className="h-5 w-16 rounded-full" />
        <Shimmer className="h-5 w-12 rounded-full" />
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonBoard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3.5 w-2/3 rounded-full" />
          <Shimmer className="h-3 w-1/3 rounded-full" />
        </div>
      </div>
      {/* Thumbnail strip */}
      <div className="flex gap-1.5">
        <Shimmer className="flex-1 h-16 rounded-xl" />
        <Shimmer className="flex-1 h-16 rounded-xl" />
        <Shimmer className="w-10 h-16 rounded-xl" />
      </div>
    </div>
  );
}
