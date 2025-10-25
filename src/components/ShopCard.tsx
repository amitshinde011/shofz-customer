import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, Heart, Phone, MessageCircle, Navigation, Eye } from "lucide-react";
import { ShopImage } from "@/components/AmazonImage";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import { useUserLocation } from "@/contexts/LocationContext";
import { FeaturedBadge } from "@/components/FeaturedBadge";

interface Shop {
  id: string;
  name: string;
  image: string;
  category: string;
  subcategories?: string[];
  categories?: string[];
  rating: number;
  distance: string;
  address: string;
  isOpen: boolean;
  delivery: boolean;
  deliveryTime?: string;
  establishedYear?: number;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  isVerified?: boolean;
  reviewCount?: number;
  nextStatusChange?: string;
  is_featured?: boolean;
}

interface ShopCardProps {
  shop: Shop;
  variant?: "grid" | "list" | "compact";
  onToggleFavorite?: (shopId: string) => void;
  isFavorite?: boolean;
  showActions?: boolean;
}

export default function ShopCard({ shop, variant = "grid", onToggleFavorite, isFavorite = false, showActions = true }: ShopCardProps) {
  const isCompact = variant === "compact";
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: viewCounts } = useEntityViewCounts('shop', shop.id);
  const { location: userLocation } = useUserLocation();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/auth', { state: { from: window.location.pathname } });
      return;
    }

    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 400);
    onToggleFavorite?.(shop.id);
  };

  const handleCallShop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `tel:${shop.phone}`;
  };

  const handleGetDirections = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shop.coordinates?.lat && shop.coordinates?.lng) {
      const destination = `${shop.coordinates.lat},${shop.coordinates.lng}`;
      const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
      const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  if (variant === "list") {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <Link to={`/shops/${shop.id}`}>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-card">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                {/* Image */}
                <div className="relative w-24 flex-shrink-0">
                  <ShopImage
                    src={shop.image}
                    alt={shop.name}
                    loading="lazy"
                  />

                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-1 right-1 w-6 h-6 rounded-full backdrop-blur-sm ${isFavorite
                      ? 'bg-destructive/20 text-black hover:bg-destructive/30'
                      : 'bg-background/20 text-black hover:bg-background/40'
                      }`}
                    onClick={handleToggleFavorite}
                  >
                    <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                          {shop.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-warning text-warning" />
                          <span className="text-xs font-medium text-foreground">{shop.rating}</span>
                          <span className="text-xs text-muted-foreground">({shop.reviewCount})</span>
                        </div>
                        {viewCounts && viewCounts.view_count > 0 && (
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{viewCounts.view_count}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={shop.isOpen ? "default" : "secondary"}
                      className={`text-xs ${shop.isOpen
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {shop.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-1 mb-2">
                    <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {shop.distance} • {shop.address}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 mb-3">
                    <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {shop.nextStatusChange}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px]"
                      onClick={handleCallShop}
                    >
                      <Phone className="w-3 h-3 mr-0.5" />
                      Call
                    </Button>
                    {shop.coordinates?.lat && shop.coordinates?.lng && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={handleGetDirections}
                      >
                        <Navigation className="w-3 h-3 mr-0.5" />
                        Direct
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="h-full touch-feedback"
    >
      <Link to={`/shops/${shop.id}`}>
        <Card className="card-shop h-full flex flex-col group">
          <CardContent className="p-0 flex-1 flex flex-col">
            {/* Image */}
            <div className="relative">
              <ShopImage
                src={shop.image}
                alt={shop.name}
                containerClassName="group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Featured Badge */}
              {shop.is_featured && (
                <div className="absolute top-2 left-2 z-10">
                  <FeaturedBadge size="sm" />
                </div>
              )}

              {/* Favorite Button - Hide in compact mode */}
              {!isCompact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-3 left-3 w-10 h-10 rounded-full backdrop-blur-md transition-all duration-300 ${isFavorite
                    ? 'bg-white/30 text-black hover:bg-white/40 shadow-lg'
                    : 'bg-white/20 text-black hover:bg-white/30'
                    }`}
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''} ${isHeartAnimating ? 'animate-heart-burst' : ''}`} />
                </Button>
              )}

              {/* Status Badge - Repositioned to avoid overlap with Featured badge */}
              <Badge
                variant={shop.isOpen ? "default" : "secondary"}
                className={`absolute ${isCompact ? 'top-2 right-2 text-xs px-2 py-0.5' : 'top-3 right-3 text-sm px-3 py-1.5'} font-bold rounded-full shadow-lg ${shop.isOpen
                  ? "bg-success text-black hover:bg-success"
                  : "bg-muted text-black"
                  }`}
              >
                {shop.isOpen ? "Open" : "Closed"}
              </Badge>
            </div>

            {/* Content */}
            <div className={`flex-1 flex flex-col gap-2 min-h-[200px] ${isCompact ? 'p-2 sm:p-3' : 'card-padding'}`}>
              {/* Shop Name and Rating */}
              <div className="flex items-start justify-between gap-2">
                <h4 className={`line-clamp-1 leading-tight flex-1 text-foreground ${isCompact ? 'text-xs sm:text-sm font-semibold' : 'text-card-title'}`}>
                  {shop.name}
                </h4>
                <div className={`flex items-center gap-1 bg-warning/10 rounded-full flex-shrink-0 ${isCompact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
                  <Star className={`fill-warning text-warning ${isCompact ? 'w-3 h-3' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'}`} />
                  <span className={`font-bold text-foreground ${isCompact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>{shop.rating}</span>
                </div>
              </div>

              {/* Category Tags - Hide in compact mode */}

              <div className="flex flex-wrap gap-1.5">
                {(shop.subcategories || shop.categories || []).slice(0, 2).map((subcategory, index) => (
                  <Badge
                    key={subcategory}
                    variant={index === 0 ? "secondary" : "outline"}
                    className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full"
                  >
                    {subcategory}
                  </Badge>
                ))}
              </div>


              {/* Reviews Count & Views - Simplified in compact mode */}

              <div className="flex items-center gap-3 text-meta text-muted-foreground font-medium">
                <span>{shop.reviewCount} reviews</span>
                {viewCounts && viewCounts.view_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{viewCounts.view_count} views</span>
                  </div>
                )}
              </div>


              {/* Distance and Hours */}
              <div className={`flex flex-col text-muted-foreground ${isCompact ? 'gap-1 text-[10px] sm:text-xs' : 'gap-1.5 text-meta'}`}>
                <div className="flex items-center gap-1.5">
                  <MapPin className={`flex-shrink-0 ${isCompact ? 'w-3 h-3' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'}`} />
                  <span className="line-clamp-1 font-medium">{shop.distance}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="line-clamp-1 font-medium">{shop.nextStatusChange}</span>
                </div>

              </div>

              {/* Action Buttons - Always render container for layout, conditionally show buttons */}
              {!isCompact && (
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  {showActions && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-10 text-xs sm:text-sm font-semibold rounded-full px-2 touch-target"
                        onClick={handleCallShop}
                      >
                        <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                        Call
                      </Button>
                      {shop.coordinates?.lat && shop.coordinates?.lng && (
                        <Button
                          size="sm"
                          className="h-9 sm:h-10 text-xs sm:text-sm font-semibold rounded-full fab-enhanced touch-target px-2"
                          onClick={handleGetDirections}
                        >
                          <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          Direct
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}