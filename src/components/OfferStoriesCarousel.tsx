import { useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Offer } from "@/hooks/useOffers";
import { EnhancedOffer, useMarkOfferViewed, useViewedOffers } from "@/hooks/useSmartOffers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import OfferStoryCard from "./OfferStoryCard";
import OfferStoriesViewer from "./OfferStoriesViewer";
import { useState } from "react";

interface OfferStoriesCarouselProps {
  offers: (Offer | EnhancedOffer)[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

// FORCE INLINE STYLES FOR CONTAINER
const WRAPPER_STYLE: React.CSSProperties = {
  width: '100%',
  marginBottom: 0,
  background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)',
  borderBottom: '1px solid hsl(var(--border) / 0.5)',
  overflow: 'hidden',
};

const HEADER_STYLE: React.CSSProperties = {
  padding: '12px 16px 8px',
};

const HEADING_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: 'hsl(var(--foreground))',
  letterSpacing: '-0.01em',
};

const CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '12px 16px 16px',
  gap: '12px',
  scrollSnapType: 'x mandatory',
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  alignItems: 'flex-start',
  whiteSpace: 'nowrap',
};

// Skeleton card for loading state
function OfferStoryCardSkeleton() {
  return (
    <div style={{ width: '80px', minWidth: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Skeleton className="w-[80px] h-[80px] rounded-full mb-1" />
      <Skeleton className="w-[60px] h-3 rounded" />
    </div>
  );
}

export default function OfferStoriesCarousel({ 
  offers, 
  onLoadMore, 
  hasMore = false, 
  isLoadingMore = false,
  isLoading = false,
  error = null,
}: OfferStoriesCarouselProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  
  // Use React Query cache for viewed offers
  const { data: viewedOffers } = useViewedOffers();
  const markOfferViewed = useMarkOfferViewed();

  const handleOfferView = useCallback((offerId: string) => {
    markOfferViewed(offerId);
  }, [markOfferViewed]);

  const handleOfferClick = (index: number) => {
    setSelectedOfferIndex(index);
    setViewerVisible(true);
  };

  // Throttled infinite scroll detection
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore || isLoadingMoreRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 150;
    
    if (isNearEnd) {
      isLoadingMoreRef.current = true;
      onLoadMore();
      // Reset the flag after a short delay to prevent rapid calls
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Show loading skeletons
  if (isLoading && offers.length === 0) {
    return (
      <div style={WRAPPER_STYLE}>
        <div style={HEADER_STYLE}>
          <h3 style={HEADING_STYLE}>🔥 Hot Offers</h3>
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          <div style={CONTAINER_STYLE}>
            {Array.from({ length: 6 }).map((_, i) => (
              <OfferStoryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (error && offers.length === 0) {
    return (
      <div style={WRAPPER_STYLE}>
        <div style={HEADER_STYLE}>
          <h3 style={HEADING_STYLE}>🔥 Hot Offers</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Failed to load offers</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <div style={WRAPPER_STYLE}>
      <div style={HEADER_STYLE}>
        <h3 style={HEADING_STYLE}>🔥 Hot Offers</h3>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>        
        {/* Stories Container */}
        <div
          ref={containerRef}
          style={CONTAINER_STYLE}
          role="list"
          aria-label="Offer stories"
        >
          {offers.map((offer, index) => (
            <OfferStoryCard
              key={offer.id}
              offer={offer as EnhancedOffer}
              isViewed={viewedOffers?.has(offer.id) ?? false}
              onView={handleOfferView}
              onClick={() => handleOfferClick(index)}
            />
          ))}
          
          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                minWidth: '60px',
                height: '80px',
              }}
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>        
      </div>

      {/* Full-Screen Stories Viewer */}
      <OfferStoriesViewer
        offers={offers}
        initialIndex={selectedOfferIndex}
        isVisible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />
    </div>
  );
}
