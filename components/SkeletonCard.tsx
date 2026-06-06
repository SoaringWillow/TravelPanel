export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 skeleton-shimmer" />
      <div className="p-4 space-y-2.5">
        {/* Badge */}
        <div className="h-4 w-16 rounded-full skeleton-shimmer" />
        {/* Title line 1 */}
        <div className="h-3.5 w-4/5 rounded-full skeleton-shimmer" />
        {/* Title line 2 */}
        <div className="h-3 w-3/5 rounded-full skeleton-shimmer" />
        {/* Footer */}
        <div className="flex justify-between pt-1">
          <div className="h-3 w-10 rounded-full skeleton-shimmer" />
          <div className="h-3 w-16 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBoardCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Emoji + header strip */}
      <div className="h-20 skeleton-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/5 rounded-full skeleton-shimmer" />
        <div className="h-3 w-2/5 rounded-full skeleton-shimmer" />
      </div>
    </div>
  );
}
