import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InfiniteScrollLoaderProps {
  isLoading?: boolean;
  hasMore?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  loadingText?: string;
  endText?: string;
}

export function InfiniteScrollLoader({
  isLoading = false,
  hasMore = true,
  error = null,
  onRetry,
  loadingText = "Loading more...",
  endText = "No more items to load",
}: InfiniteScrollLoaderProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-sm text-destructive">Failed to load more items</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">{endText}</p>
      </div>
    );
  }

  return null;
}
