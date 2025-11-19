import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Phone, Clock, MessageSquare } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { FeaturedBadge } from "./FeaturedBadge";
import { ResponsiveImage } from "./ResponsiveImage";
import { calculateShopStatus } from "@/lib/businessHours";
import { calculateDistance, formatDistance } from "@/lib/distanceCalculation";
import { useUserLocation } from "@/contexts/LocationContext";
import DirectionsButton from "./DirectionsButton";
import { ShopDeliveryBadge } from "./shop/ShopDeliveryBadge";

interface FeaturedShopCardProps {
  shop: any;
}

export const FeaturedShopCard = ({ shop }: FeaturedShopCardProps) => {
  const navigate = useNavigate();
  const { location } = useUserLocation();

  // Calculate distance from user location
  const distanceKm = location && shop.location
    ? calculateDistance(location, { lat: shop.location.lat, lng: shop.location.lng })
    : undefined;
  
  const distance = distanceKm !== undefined ? formatDistance(distanceKm) : 'N/A';

  // Calculate shop status (open/closed, hours)
  const shopStatus = calculateShopStatus(shop.business_hours as any);

  const handleInquire = (e: React.MouseEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      shop_id: shop.id,
    });
    navigate(`/inquiry/new?${params.toString()}`);
  };

  return (
    <NavLink to={`/shops/${shop.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300  bg-gradient-to-br from-amber-50/50 to-orange-50/50 h-full group relative flex flex-col">
        {/* Featured Badge - Top Right */}
        <div className="absolute top-2 left-2 z-10">
          <FeaturedBadge size="sm" />
        </div>

        {/* Shop Image */}
        <div className="relative w-full aspect-square overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
          <ResponsiveImage
            src={shop.logo_url || "/placeholder.svg"}
            alt={shop.name}
            size="square"
            objectFit="contain"
            className="group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <CardContent className="p-3 sm:p-4 pb-4 flex flex-col flex-grow">
          {/* Shop Name */}
          <h3 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2 text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {shop.name}
          </h3>

          {/* Categories & Delivery */}
          <div className="flex flex-wrap gap-1 mb-2">
            {shop.categories?.slice(0, 2).map((category, index) => (
              <Badge
                key={category}
                variant={index === 0 ? "default" : "secondary"}
                className="text-[9px] sm:text-[10px] px-1.5 py-0"
              >
                {category}
              </Badge>
            ))}
            <ShopDeliveryBadge
              deliveryAvailable={shop.delivery_available}
              deliveryCoverageKm={shop.delivery_coverage_km}
              distanceKm={distanceKm}
              variant="compact"
            />
          </div>

          {/* Rating & Reviews - Only show if shop has rating */}
          {(shop.rating && shop.rating > 0) && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-xs sm:text-sm">{shop.rating.toFixed(1)}</span>
              </div>
              {(shop.total_reviews && shop.total_reviews > 0) && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({shop.total_reviews} {shop.total_reviews === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </div>
          )}

          {/* Distance & Status */}
          <div className="space-y-1 text-[10px] sm:text-xs text-muted-foreground flex-grow">
            {distance !== 'N/A' && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{distance} away</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className={`truncate ${shopStatus.isOpen ? "text-green-600 font-medium" : "text-red-600"}`}>
                {shopStatus.isOpen ? 'Open' : 'Closed'}
                {shopStatus.nextStatusChange && shopStatus.nextStatusChange !== 'Closed' && ` • ${shopStatus.nextStatusChange}`}
              </span>
            </div>

            {shop.phone_number && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{shop.phone_number}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </NavLink>
  );
};
