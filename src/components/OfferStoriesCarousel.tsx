import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Offer } from "@/hooks/useOffers";
import OfferStoryCard from "./OfferStoryCard";
import OfferStoriesViewer from "./OfferStoriesViewer";

interface OfferStoriesCarouselProps {
  offers: Offer[];
}

// FORCE INLINE STYLES FOR CONTAINER
const WRAPPER_STYLE: React.CSSProperties = {
  width: '100%',
  marginBottom: 0,
  background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
};

const HEADER_STYLE: React.CSSProperties = {
  padding: '12px 16px 8px',
};

const HEADING_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: '#262626',
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

export default function OfferStoriesCarousel({ offers }: OfferStoriesCarouselProps) {
  const [viewedOffers, setViewedOffers] = useState<Set<string>>(new Set());
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOfferView = (offerId: string) => {
    setViewedOffers((prev) => new Set(prev).add(offerId));
    // Persist to localStorage
    const viewed = Array.from(viewedOffers);
    viewed.push(offerId);
    localStorage.setItem("viewedOffers", JSON.stringify(viewed));
  };

  const handleOfferClick = (index: number) => {
    setSelectedOfferIndex(index);
    setViewerVisible(true);
  };

  const checkScrollPosition = () => {
    if (!containerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;

    const scrollAmount = 300;
    const newScrollLeft =
      direction === "left"
        ? containerRef.current.scrollLeft - scrollAmount
        : containerRef.current.scrollLeft + scrollAmount;

    containerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

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

    // Check scroll position on mount
    checkScrollPosition();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, []);

  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <div style={WRAPPER_STYLE}>
      <div style={HEADER_STYLE}>
        <h3 style={HEADING_STYLE}>Hot Offers</h3>
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