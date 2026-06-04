import { Skeleton } from '@/components/ui/skeleton';

export default function InboxCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="w-full h-32 rounded-none" />
      <div className="p-4 space-y-2.5">
        {/* Platform badge */}
        <Skeleton className="h-4 w-20 rounded-full" />
        {/* Title */}
        <Skeleton className="h-3.5 w-full rounded-full" />
        <Skeleton className="h-3.5 w-4/5 rounded-full" />
        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
