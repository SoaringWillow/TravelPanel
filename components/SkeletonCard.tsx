'use client';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />

      <div className="p-4 space-y-3">
        {/* Platform badge placeholder */}
        <div className="h-4 bg-gray-200 rounded-full w-20" />

        {/* Title placeholder — two lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded-full w-full" />
          <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
        </div>

        {/* Meta row placeholder */}
        <div className="flex gap-2 pt-1">
          <div className="h-3 bg-gray-200 rounded-full w-8" />
          <div className="h-3 bg-gray-200 rounded-full w-10" />
          <div className="h-3 bg-gray-200 rounded-full w-12" />
        </div>

        {/* Footer placeholder */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="h-3 bg-gray-200 rounded-full w-12" />
          <div className="h-3 bg-gray-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}
