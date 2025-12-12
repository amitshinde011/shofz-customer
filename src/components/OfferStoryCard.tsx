import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { Offer } from "@/hooks/useOffers";
import UniversalImage from "./UniversalImage";

interface OfferStoryCardProps {
  offer: Offer & {
    distanceKm?: number;
    formattedDistance?: string;
    isFavoriteShop?: boolean;
  };
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
  marginBottom: '4px',
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

const TITLE_STYLE: React.CSSProperties = {
  fontSize: '11px',
  width: '80px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  margin: 0,
  fontWeight: 500,
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

// Favorite badge style
const FAVORITE_BADGE_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  zIndex: 10,
};

// Distance badge colors
const getDistanceColor = (distanceKm?: number): string => {
  if (distanceKm === undefined) return 'hsl(var(--muted-foreground))';
  if (distanceKm < 1) return 'hsl(142 76% 36%)'; // Green - nearby
  if (distanceKm < 5) return 'hsl(45 93% 47%)'; // Yellow/amber - moderate
  return 'hsl(var(--muted-foreground))'; // Gray - far
};

export default function OfferStoryCard({ offer, isViewed = false, onView, onClick }: OfferStoryCardProps) {
  const handleClick = () => {
    if (onView && !isViewed) {
      onView(offer.id);
    }
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
  const isFavorite = (offer as any).isFavoriteShop;
  const formattedDistance = (offer as any).formattedDistance;
  const distanceKm = (offer as any).distanceKm;

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
      aria-label={`Offer: ${offer.title} from ${shopName}${isFavorite ? ' (Favorite)' : ''}${formattedDistance ? `, ${formattedDistance} away` : ''}`}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div style={RING_CONTAINER_STYLE}>
        {/* Favorite Badge */}
        {isFavorite && (
          <motion.div 
            style={FAVORITE_BADGE_STYLE}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
          >
            <Star className="w-3 h-3 text-white fill-white" />
          </motion.div>
        )}

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

      {/* Title */}
      <p style={TITLE_STYLE} title={offer.title}>
        {offer.title}
      </p>

      {/* Distance Badge */}
      {formattedDistance && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '9px',
            fontWeight: 600,
            color: getDistanceColor(distanceKm),
            marginTop: '2px',
          }}
        >
          <MapPin className="w-2.5 h-2.5" />
          <span>{formattedDistance}</span>
        </div>
      )}
    </motion.div>
  );
}