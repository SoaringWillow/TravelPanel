'use client';

// Base shimmer animation applied to all skeleton elements
const shimmer = `
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

function ShimmerBox({ className = '' }: { className?: string }) {
  return (
    <>
      <style>{shimmer}</style>
      <div
        className={`rounded-lg ${className} dark:shimmer-dark`}
        style={{
          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
          backgroundSize: '800px 100%',
          animation: 'shimmer 1.4s infinite linear',
        }}
      />
    </>
  );
}

// Matches InboxCard layout: thumbnail + title + tag row
export function SkeletonInboxCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex gap-3 p-3">
      <ShimmerBox className="w-16 h-16 flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <ShimmerBox className="h-3.5 w-3/4" />
        <ShimmerBox className="h-3 w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <ShimmerBox className="h-5 w-12 rounded-full" />
          <ShimmerBox className="h-5 w-16 rounded-full" />
          <ShimmerBox className="h-5 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Matches BoardCard layout: cover image + name + count
export function SkeletonBoardCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <ShimmerBox className="w-full h-32 rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBox className="h-4 w-2/3" />
        <ShimmerBox className="h-3 w-1/3" />
      </div>
    </div>
  );
}
