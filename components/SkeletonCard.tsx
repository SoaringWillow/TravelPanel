'use client';

/**
 * Shimmer skeleton cards for page-level loading states.
 * Match the visual footprint of InboxCard and BoardCard respectively.
 */

export function InboxSkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-gray-200" />
      <div className="p-4 space-y-2.5">
        {/* Platform badge */}
        <div className="h-4 w-16 bg-gray-200 rounded-full" />
        {/* Title */}
        <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
        <div className="h-3.5 bg-gray-200 rounded-full w-3/5" />
        {/* Meta row */}
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-8 bg-gray-200 rounded-full" />
          <div className="h-3 w-12 bg-gray-200 rounded-full" />
        </div>
        {/* Footer */}
        <div className="flex justify-between pt-2 border-t border-gray-50">
          <div className="h-3 w-10 bg-gray-200 rounded-full" />
          <div className="flex gap-1.5">
            <div className="h-6 w-6 bg-gray-200 rounded-lg" />
            <div className="h-6 w-6 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoardSkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[160px] animate-pulse">
      <div className="p-4 space-y-3 flex flex-col h-full">
        {/* Emoji placeholder */}
        <div className="h-7 w-7 bg-gray-200 rounded-lg" />
        {/* Name */}
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        {/* Item count */}
        <div className="h-3 bg-gray-200 rounded-full w-1/3" />
        {/* Spacer */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  variant: 'inbox' | 'board';
}

export function SkeletonGrid({ count = 6, variant }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) =>
        variant === 'inbox' ? (
          <InboxSkeletonCard key={i} />
        ) : (
          <BoardSkeletonCard key={i} />
        ),
      )}
    </div>
  );
}
