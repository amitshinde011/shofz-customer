import { Skeleton } from '@/components/ui/skeleton';

export const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Gallery Skeleton */}
      <Skeleton className="w-full aspect-square" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-4">
        <div>
          <Skeleton className="h-8 w-3/4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>

        <Skeleton className="h-32 w-full rounded-lg" />
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <Skeleton className="h-12 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
};
