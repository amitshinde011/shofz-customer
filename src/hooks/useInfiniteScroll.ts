import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  enabled?: boolean;
  threshold?: number; // Distance from bottom in pixels
  hasMore?: boolean;
  isLoading?: boolean;
}

export const useInfiniteScroll = ({
  onLoadMore,
  enabled = true,
  threshold = 200,
  hasMore = true,
  isLoading = false,
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      
      if (
        target.isIntersecting &&
        enabled &&
        hasMore &&
        !isLoading &&
        !loadingRef.current
      ) {
        loadingRef.current = true;
        onLoadMore();
        
        // Reset loading flag after a short delay to prevent rapid successive calls
        setTimeout(() => {
          loadingRef.current = false;
        }, 500);
      }
    },
    [onLoadMore, enabled, hasMore, isLoading]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const option = {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0.1,
    };

    const observer = new IntersectionObserver(handleObserver, option);
    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver, threshold]);

  return { observerRef };
};
