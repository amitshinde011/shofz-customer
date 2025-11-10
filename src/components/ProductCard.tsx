import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Heart, MessageCircleHeart, Eye, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/services/productService";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import { ProductThumbnail } from "@/components/AmazonImage";
import { useAuth } from "@/contexts/AuthContext";
import { FeaturedBadge } from "@/components/FeaturedBadge";

interface ProductCardProps {
  product: Product;
  onInquire?: (product: Product) => void;
  onClick?: (product: Product) => void;
  variant?: "default" | "compact";
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  showFavoriteButton?: boolean;
}

export default function ProductCard({ 
  product, 
  onInquire, 
  onClick, 
  variant = "default", 
  isFavorite = false, 
  onToggleFavorite,
  showFavoriteButton = true
}: ProductCardProps) {
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const { data: viewCounts } = useEntityViewCounts('product', product.id);
  const { user: isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/auth', { state: { from: window.location.pathname } });
      return;
    }

    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 400);
    
    onToggleFavorite?.(product.id);
  };

  const handleInquire = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/inquiry/new?product=${product.id}` } });
      return;
    }

    onInquire?.(product);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    } else {
      // Default behavior: navigate to product detail page
      navigate(`/products/${product.id}`);
    }
  };

  const discountPercent = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  // Check if product is available based on inventory tracking
  // If inventory_tracking is false, product is always available
  // If inventory_tracking is true, check stock_quantity (null or > 0 means available)
  const isInStock = product.is_active && (
    !product.inventory_tracking || 
    product.stock_quantity === null || 
    product.stock_quantity > 0
  );
  const productImage = product.images?.[0] || '/placeholder.svg';
  const shopName = product.shops?.name || 'Unknown Shop';

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="h-full touch-feedback"
    >
      <Card
        className="card-product h-full flex flex-col cursor-pointer group"
        onClick={handleCardClick}
      >
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Image Container */}
          <div className="relative">
            <ProductThumbnail
              src={productImage}
              alt={product.name}
              containerClassName="group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />

            {/* Featured Badge */}
            {product.is_featured && (
              <div className="absolute top-2 left-2 z-10">
                <FeaturedBadge size="sm" />
              </div>
            )}

            {/* Favorite Button */}
            {showFavoriteButton && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-3 right-3 w-6 h-6 rounded-full backdrop-blur-md transition-all duration-300 ${
                  isFavorite
                    ? 'bg-white/30 text-black hover:bg-white/40 shadow-lg'
                    : 'bg-white/20 text-black hover:bg-white/30'
                }`}
                onClick={toggleFavorite}
              >
                <Heart
                  className={`w-5 h-5 transition-all duration-300 ${isFavorite ? 'fill-current' : ''} ${isHeartAnimating ? 'animate-heart-burst' : ''}`}
                />
              </Button>
            )}

            {/* Stock Status Overlay */}
            {!isInStock && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
              >
                <Badge variant="destructive" className="text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                  Out of Stock
                </Badge>
              </motion.div>
            )}

            {/* Discount Badge */}
            {discountPercent > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="absolute top-3 left-4"
              >
                <div className="badge-premium shimmer inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground absolute rounded-full backdrop-blur-md h-6  transition-all duration-300 bg-white/20 text-black hover:bg-white/30">
                  {discountPercent}% OFF
                </div>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 flex flex-col gap-2 ${variant === "compact" ? "p-2 sm:p-3" : "card-padding"}`}>
            {/* Product Name */}
            <h5 className={`line-clamp-2 leading-tight text-foreground ${variant === "compact" ? "text-xs sm:text-sm font-semibold " : "text-card-title "}`}>
              {product.name}
            </h5>

            {/* Shop Name and Views */}
            {variant === "default" && (
              <>
                <div className="flex items-center justify-between text-meta text-muted-foreground">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="line-clamp-1 font-medium">{shopName}</span>
                  </div>
                  {viewCounts && viewCounts.view_count > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="font-medium">{viewCounts.view_count}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Badge */}
                {product.shops?.delivery_available && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-success/10 text-success w-fit"
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    Delivery available
                  </Badge>
                )}
              </>
            )}

            {/* Price Section */}
            <div className="mt-auto pt-1">
              <div className={`flex items-baseline gap-1.5 ${variant === "compact" ? "" : "mb-3"}`}>
                <span className={`font-bold text-foreground ${variant === "compact" ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
                  ₹{product.price.toLocaleString()}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className={`text-muted-foreground line-through font-medium ${variant === "compact" ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}>
                    ₹{product.compare_at_price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Action Button - Only show in default variant */}
              {variant === "default" && (
                <Button
                  size="lg"
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm font-bold rounded-full fab-enhanced touch-target mt-2"
                  disabled={!isInStock}
                  onClick={handleInquire}
                >
                  {isInStock ? (
                    <>
                      <MessageCircleHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Inquire
                    </>
                  ) : (
                    'Unavailable'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}