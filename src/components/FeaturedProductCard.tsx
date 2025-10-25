import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { FeaturedBadge } from "./FeaturedBadge";
import { ResponsiveImage } from "./ResponsiveImage";
import { Button } from "./ui/button";

interface FeaturedProductCardProps {
  product: any;
}

export const FeaturedProductCard = ({ product }: FeaturedProductCardProps) => {
  const navigate = useNavigate();
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleInquire = (e: React.MouseEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      product_name: product.name,
      shop_id: product.shop_id,
    });
    navigate(`/inquiry/new?${params.toString()}`);
  };

  return (
    <NavLink to={`/products/${product.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 h-full group relative">
        {/* Featured Badge - Top Left */}
        <div className="absolute top-2 left-2 z-10">
          <FeaturedBadge size="sm" />
        </div>

        {/* Discount Badge - Top Right */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-red-500 text-white font-bold">
              -{discountPercentage}%
            </Badge>
          </div>
        )}

        {/* Product Image */}
        <div className="relative w-full aspect-square overflow-hidden bg-white flex items-center justify-center">
          <ResponsiveImage
            src={product.images?.[0] || "/placeholder.svg"}
            alt={product.name}
            size="square"
            objectFit="contain"
            className="group-hover:scale-105 transition-transform duration-300"
          />
          {product.is_active && 
            (!product.inventory_tracking || product.stock_quantity === null || product.stock_quantity > 0) && (
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-green-500 text-white text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                In Stock
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="card-padding">
          {/* Product Name */}
          <h3 className="text-card-title mb-2 text-foreground line-clamp-2 group-hover:text-primary transition-colors ">
            {product.name}
          </h3>

          {/* Shop Info */}
          {product.shops && (
            <div className="flex items-center gap-1 mb-3">
              <span className="text-meta text-muted-foreground">by</span>
              <span className="text-meta font-medium text-foreground">{product.shops.name}</span>
              {product.shops.is_verified && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  ✓
                </Badge>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-base sm:text-lg font-bold text-primary">
              ₹{product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-muted-foreground line-through">
                ₹{product.compare_at_price?.toLocaleString()}
              </span>
            )}
          </div>

          {/* Category & Brand */}
          <div className="flex flex-wrap gap-1">
            {product.category && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {product.category}
              </Badge>
            )}
            {product.brand && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {product.brand}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </NavLink>
  );
};
