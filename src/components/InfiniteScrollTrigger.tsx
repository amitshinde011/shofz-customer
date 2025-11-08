import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  enabled?: boolean;
  threshold?: number;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function InfiniteScrollTrigger({
  onLoadMore,
  enabled = true,
  threshold = 200,
  hasMore = true,
  isLoading = false,
}: InfiniteScrollTriggerProps) {
  const { observerRef } = useInfiniteScroll({
    onLoadMore,
    enabled,
    threshold,
    hasMore,
    isLoading,
  });

  return (
    <div
      ref={observerRef}
      className="h-4 w-full"
      aria-hidden="true"
    />
  );
}
