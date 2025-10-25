import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Tag, MessageSquare, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Offer } from "@/hooks/useOffers";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import AmazonImage, { BannerImage } from "@/components/AmazonImage";
import { FeaturedBadge } from "@/components/FeaturedBadge";

interface OfferCardProps {
  offer: Offer;
  onInquire?: () => void;
  variant?: "default" | "compact";
  hideButton?: boolean;
}

export default function OfferCard({ offer, onInquire, variant = "default", hideButton = false }: OfferCardProps) {
  const navigate = useNavigate();
  const { data: viewCounts } = useEntityViewCounts('offer', offer.id);

  // Debug logging
  console.log(`[OfferCard] Offer ${offer.id} - viewCounts data:`, viewCounts, 'Type:', typeof viewCounts, 'Has view_count:', viewCounts?.view_count);

  const getDiscountText = () => {
    if (offer.offer_type === "promotion") {
      return "PROMO";
    }
    if (offer.discount_type === "percentage") {
      return `${offer.discount_value}% OFF`;
    } else if (offer.discount_type === "fixed") {
      return `₹${offer.discount_value} OFF`;
    }
    return `${offer.discount_value} OFF`;
  };

  const getValidUntilText = () => {
    if (!offer.valid_until) return "Limited time offer";

    const date = new Date(offer.valid_until);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Correct type assignment for toLocaleDateString options
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit', // This is a valid literal string
        month: 'short'  // This is a valid literal string
    };
    
    if (diffDays < 1) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    if (diffDays <= 7) return `${diffDays} days left`;
    
    return `Valid ${new Date(offer.valid_from).toLocaleDateString('en-GB', options)} - ${date.toLocaleDateString('en-GB', options)}`;
  };

  const handleViewDetails = () => {
    navigate(`/offers/${offer.id}`);
  };

  const handleInquire = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInquire) {
      onInquire();
    } else {
      // Use the first product's name if available, otherwise fall back to offer title
      const productName = offer.products && offer.products.length > 0
        ? offer.products.map(p => p.name).join(', '):'';
      let inquiryDescription = `I'm interested in the offer: ${offer?.title}. ${offer?.description || ''}`;
       navigate(`/inquiry/new?offer_id=${offer?.id}&shop_id=${offer?.shop_id}&product_name=${encodeURIComponent(productName || '')}&description=${encodeURIComponent(inquiryDescription)}`);
    }
  };

  if (variant === "compact") {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow border-0 overflow-hidden card-offer"
        onClick={handleViewDetails}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {offer.image_url ? (
              <div className="w-16 sm:w-20 flex-shrink-0">
                <AmazonImage
                  src={offer.image_url}
                  alt={offer.title}
                  aspectRatio="square"
                  objectFit="cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-16 sm:w-20 aspect-square bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">{offer.title}</h3>
                <Badge className="bg-destructive text-black text-[10px] sm:text-xs font-bold whitespace-nowrap px-2 py-0.5">
                  {getDiscountText()}
                </Badge>
              </div>
              {offer.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{offer.description}</p>
              )}
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="line-clamp-1">{getValidUntilText()}</span>
                </div>
                {viewCounts && viewCounts.view_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{viewCounts.view_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="touch-feedback h-full"
    >
      <Card
        className="card-offer cursor-pointer group h-full flex flex-col"
        onClick={handleViewDetails}
      >
        <CardContent className="p-0 flex-1 flex flex-col">
          {offer.image_url ? (
            <div className="relative">
              <BannerImage
                src={offer.image_url}
                alt={offer.title}
                containerClassName="group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Featured Badge */}
              {offer.is_featured && (
                <div className="absolute top-2 left-2 z-10">
                  <FeaturedBadge size="sm" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <Badge className="badge-premium shimmer text-xs sm:text-sm px-3 py-1">
                  {getDiscountText()}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 via-destructive/20 to-warning/20 flex items-center justify-center overflow-hidden">
              <div className="text-center p-4 z-10">
                <Tag className="w-12 h-12 text-primary mx-auto mb-2" />
                <Badge className="badge-premium text-xs px-3 py-1">
                  {getDiscountText()}
                </Badge>
              </div>
            </div>
          )}

          <div className="card-padding flex-1 flex flex-col gap-2">
            {/* Title */}
            <h3 className="text-card-title line-clamp-2 leading-tight text-foreground">
              {offer.title}
            </h3>

            {/* Description */}
            {offer.description && (
              <p className="text-meta text-muted-foreground line-clamp-2 font-medium">{offer.description}</p>
            )}

            {/* Shop Name */}
            {offer.shops && (
              <div className="flex items-center gap-1.5 text-meta">
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-muted-foreground line-clamp-1">{offer.shops.name}</span>
              </div>
            )}

            {/* Time and Views */}
            <div className="flex items-center justify-between text-meta text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="line-clamp-1">{getValidUntilText()}</span>
              </div>
              {viewCounts && viewCounts.view_count > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{viewCounts.view_count}</span>
                </div>
              )}
            </div>

            {/* Action Button - Hide if hideButton prop is true */}
            {!hideButton && (
              <Button
                className="w-full h-10 sm:h-11 text-xs sm:text-sm font-bold rounded-full fab-enhanced touch-target mt-auto"
                onClick={handleInquire}
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                Inquire
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}