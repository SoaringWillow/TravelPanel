'use client';

export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 skeleton-shimmer" />

      <div className="p-4 space-y-3">
        {/* Platform badge placeholder */}
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />

        {/* Title lines */}
        <div className="space-y-2">
          <div className="skeleton-shimmer h-3.5 rounded-full w-4/5" />
          <div className="skeleton-shimmer h-3 rounded-full w-3/5" />
        </div>

        {/* Tag pill placeholders */}
        <div className="flex gap-1.5 pt-1">
          <div className="skeleton-shimmer h-5 w-12 rounded-full" />
          <div className="skeleton-shimmer h-5 w-16 rounded-full" />
          <div className="skeleton-shimmer h-5 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
