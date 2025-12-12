import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Offer } from "@/hooks/useOffers";
import { EnhancedOffer } from "@/hooks/useSmartOffers";
import OfferStoryCard from "./OfferStoryCard";
import OfferStoriesViewer from "./OfferStoriesViewer";

interface OfferStoriesCarouselProps {
  offers: (Offer | EnhancedOffer)[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
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

export default function OfferStoriesCarousel({ 
  offers, 
  onLoadMore, 
  hasMore = false, 
  isLoadingMore = false 
}: OfferStoriesCarouselProps) {
  const [viewedOffers, setViewedOffers] = useState<Set<string>>(new Set());
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOfferView = (offerId: string) => {
    setViewedOffers((prev) => new Set(prev).add(offerId));
    const viewed = Array.from(viewedOffers);
    viewed.push(offerId);
    localStorage.setItem("viewedOffers", JSON.stringify(viewed));
  };

  const handleOfferClick = (index: number) => {
    setSelectedOfferIndex(index);
    setViewerVisible(true);
  };

  // Infinite scroll detection
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 150;
    
    if (isNearEnd) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

  useEffect(() => {
    // Load viewed offers from localStorage
    const stored = localStorage.getItem("viewedOffers");
    if (stored) {
      try {
        const viewed = JSON.parse(stored);
        setViewedOffers(new Set(viewed));
      } catch (e) {
        console.error("Failed to parse viewed offers", e);
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

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
              offer={offer}
              isViewed={viewedOffers.has(offer.id)}
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