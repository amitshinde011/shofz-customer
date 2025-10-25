import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Clock, Store, MessageSquare } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { FeaturedBadge } from "./FeaturedBadge";
import { ResponsiveImage } from "./ResponsiveImage";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";

interface FeaturedOfferCardProps {
  offer: any;
}

export const FeaturedOfferCard = ({ offer }: FeaturedOfferCardProps) => {
  const navigate = useNavigate();
  
  const getDiscountText = () => {
    if (offer.discount_type === 'percentage') {
      return `${offer.discount_value}% OFF`;
    }
    return `₹${offer.discount_value} OFF`;
  };

  const getOfferTypeLabel = () => {
    const typeMap: Record<string, string> = {
      'percentage': 'Percentage Off',
      'fixed_amount': 'Fixed Amount',
      'fixed': 'Fixed Amount',
      'buy_x_get_y': 'Buy X Get Y',
      'promotion': 'Promotion',
      'discount': 'Discount',
    };
    return typeMap[offer.offer_type] || offer.offer_type;
  };

  const timeRemaining = offer.valid_until
    ? formatDistanceToNow(new Date(offer.valid_until), { addSuffix: true })
    : null;

  const handleInquire = (e: React.MouseEvent) => {
    e.preventDefault();
    const inquiryDescription = `I'm interested in the offer: ${offer.title}. ${offer.description || ''}`;
    const params = new URLSearchParams({
      offer_id: offer.id,
      shop_id: offer.shop_id,
      product_name: offer.title,
      description: inquiryDescription,
    });
    navigate(`/inquiry/new?${params.toString()}`);
  };

  return (
    <NavLink to={`/offers/${offer.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-amber-200 bg-gradient-to-br from-red-50/50 to-orange-50/50 h-full group relative">
        {/* Featured Badge - Top Left */}
        <div className="absolute top-2 left-2 z-10">
          <FeaturedBadge size="sm" />
        </div>

        {/* Discount Badge - Top Right */}
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-600 hover:bg-red-700 shimmer text-xs sm:text-sm px-1 py-1">
            {getDiscountText()}
          </Badge>
        </div>

        {/* Offer Image */}
        <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          {offer.image_url ? (
            <ResponsiveImage
              src={offer.image_url}
              alt={offer.title}
              size="square"
              objectFit="contain"
              className="group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag className="w-20 h-20 text-white opacity-50" />
            </div>
          )}
        </div>

        <CardContent className="card-padding">
          {/* Offer Title */}
          <h3 className="text-card-title mb-2 text-foreground line-clamp-2 group-hover:text-primary transition-colors ">
            {offer.title}
          </h3>

          {/* Offer Description */}
          {offer.description && (
            <p className="text-body text-muted-foreground mb-3 line-clamp-2">
              {offer.description}
            </p>
          )}

          {/* Shop Info */}
          {offer.shops && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-body font-medium text-foreground">
                {offer.shops.name}
              </span>
            </div>
          )}

          {/* Offer Type & Time Remaining */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {getOfferTypeLabel()}
            </Badge>
            {timeRemaining && (
              <div className="flex items-center gap-1 text-meta text-amber-600 font-medium">
                <Clock className="w-3 h-3" />
                <span>Ends {timeRemaining}</span>
              </div>
            )}
          </div>

          {/* Applicable Products */}
          {offer.products && offer.products.length > 0 && (
            <div>
              <p className="text-meta text-muted-foreground mb-1">
                Valid on {offer.products.length} product{offer.products.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-1">
                {offer.products.slice(0, 3).map((product) => (
                  <div key={product.id} className="w-12 h-12 rounded overflow-hidden border border-border bg-white flex items-center justify-center">
                    <ResponsiveImage
                      src={product.images?.[0] || "/placeholder.svg"}
                      alt={product.name}
                      size="thumbnail"
                      objectFit="contain"
                    />
                  </div>
                ))}
                {offer.products.length > 3 && (
                  <div className="w-12 h-12 rounded border border-border flex items-center justify-center bg-muted text-meta font-medium">
                    +{offer.products.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </NavLink>
  );
};