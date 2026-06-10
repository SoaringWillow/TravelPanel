// Shimmer skeleton cards that match InboxCard and BoardCard dimensions.
// Drop these in wherever loading === true to avoid layout shift.

export function SkeletonInboxCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-gray-100" />
      <div className="p-4 space-y-3">
        {/* Platform badge */}
        <div className="h-4 bg-gray-100 rounded-full w-24" />
        {/* Title */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-100 rounded-full w-full" />
          <div className="h-3.5 bg-gray-100 rounded-full w-4/5" />
        </div>
        {/* Meta strip */}
        <div className="flex gap-2 pt-0.5">
          <div className="h-3 bg-gray-100 rounded-full w-10" />
          <div className="h-3 bg-gray-100 rounded-full w-10" />
        </div>
        {/* Footer */}
        <div className="flex justify-between pt-1 border-t border-gray-50">
          <div className="h-3 bg-gray-100 rounded-full w-14" />
          <div className="h-3 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBoardCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Cover image area */}
      <div className="w-full h-28 bg-gray-100" />
      <div className="p-3 space-y-2">
        {/* Emoji + name row */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 rounded-md" />
          <div className="h-3.5 bg-gray-100 rounded-full flex-1" />
        </div>
        {/* Item count */}
        <div className="h-3 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}
