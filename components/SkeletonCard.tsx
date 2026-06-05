'use client';

// Animated shimmer placeholder matching InboxCard and BoardCard dimensions.
// Show 4–6 of these while IndexedDB loads, then replace with real content.

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'tp-shimmer 1.4s ease-in-out infinite' }}
    />
  );
}

const shimmerKeyframes = `
  @keyframes tp-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export function SkeletonInboxCard() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
        {/* Platform chip + date */}
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-24 rounded-full" />
          <Shimmer className="h-4 w-16" />
        </div>
        {/* Title */}
        <div className="space-y-1.5">
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-4/5" />
        </div>
        {/* Thumbnail placeholder */}
        <Shimmer className="h-28 w-full rounded-xl" />
        {/* Tags */}
        <div className="flex gap-1.5">
          <Shimmer className="h-5 w-14 rounded-full" />
          <Shimmer className="h-5 w-18 rounded-full" />
          <Shimmer className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </>
  );
}

export function SkeletonBoardCard() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-h-[160px] flex flex-col space-y-3">
        {/* Emoji */}
        <Shimmer className="h-8 w-8 rounded-lg" />
        {/* Name */}
        <Shimmer className="h-4 w-3/4" />
        {/* Count */}
        <Shimmer className="h-3 w-1/2" />
      </div>
    </>
  );
}
