import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}

export function InboxCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <Skeleton className="w-full h-32 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-2.5 w-14 rounded-full" />
        <Skeleton className="h-3.5 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-3/5 rounded-full" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BoardCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[160px] flex flex-col p-4">
      <Skeleton className="w-10 h-10 rounded-full mb-3" />
      <Skeleton className="h-3.5 w-3/5 rounded-full mb-2" />
      <Skeleton className="h-3 w-2/5 rounded-full" />
    </div>
  );
}
