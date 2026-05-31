export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-32 bg-gray-200" />

      <div className="p-3 space-y-2">
        {/* Platform badge */}
        <div className="h-4 w-16 bg-gray-200 rounded-full" />
        {/* Title */}
        <div className="h-3.5 w-full bg-gray-200 rounded" />
        <div className="h-3.5 w-3/4 bg-gray-200 rounded" />
        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-10 bg-gray-100 rounded-full" />
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
          <div className="h-5 w-8 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
