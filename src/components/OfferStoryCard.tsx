import { motion } from "framer-motion";
import { Offer } from "@/hooks/useOffers";
import UniversalImage from "./UniversalImage";

interface OfferStoryCardProps {
  offer: Offer;
  isViewed?: boolean;
  onView?: (offerId: string) => void;
  onClick?: () => void;
}

// FORCE INLINE STYLES TO ENSURE CIRCULAR RENDERING
const STORY_CARD_STYLE: React.CSSProperties = {
  width: '80px',
  minWidth: '80px',
  maxWidth: '80px',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  flexShrink: 0,
};

const RING_CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '80px',
  height: '80px',
  marginBottom: '8px',
};

const RING_STYLE_BASE: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  padding: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const IMAGE_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '3px solid white',
};

const TITLE_STYLE: React.CSSProperties = {
  fontSize: '12px',
  width: '80px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  margin: 0,
};

const SHOP_LOGO_WRAPPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: '2px solid white',
  background: 'white',
  overflow: 'hidden',
};

const SHOP_LOGO_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

export default function OfferStoryCard({ offer, isViewed = false, onView, onClick }: OfferStoryCardProps) {
  const handleClick = () => {
    // Mark as viewed
    if (onView && !isViewed) {
      onView(offer.id);
    }
    // Call custom onClick handler if provided
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const shopLogo = offer.shops?.logo_url;
  const shopName = offer.shops?.name || "Shop";
  const offerImage = offer.image_url || "/placeholder.svg";

  // Dynamic ring background based on viewed state
  const ringStyle: React.CSSProperties = {
    ...RING_STYLE_BASE,
    background: isViewed
      ? '#dbdbdb'
      : 'conic-gradient(from 0deg, #ff6b35 0%, #f7931e 25%, #ff6b35 50%, #f7931e 75%, #ff6b35 100%)',
  };

  return (
    <motion.div
      style={STORY_CARD_STYLE}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Offer: ${offer.title} from ${shopName}`}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div style={RING_CONTAINER_STYLE}>
        <div style={ringStyle}>
          <UniversalImage
            src={offerImage}
            alt={offer.title}
            size="story"
            containerStyle={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid white",
              backgroundColor: "white",
            }}
            style={{
              objectFit: "cover",
            }}
            loading="lazy"
          />
        </div>

        {/* Shop Logo Badge */}
        {shopLogo && (
          <div style={SHOP_LOGO_WRAPPER_STYLE}>
            <UniversalImage
              src={shopLogo}
              alt={`${shopName} logo`}
              size="thumbnail"
              containerStyle={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
              }}
              style={{
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>

      <p style={TITLE_STYLE} title={offer.title}>
        {offer.title}
      </p>
    </motion.div>
  );
}