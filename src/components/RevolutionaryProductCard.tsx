import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircleHeart, Eye, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { Product } from "@/services/productService";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import { ResponsiveImage } from "@/components/ResponsiveImage";

interface RevolutionaryProductCardProps {
  product: Product;
  onInquire?: (product: Product) => void;
  onClick?: (product: Product) => void;
}

export default function RevolutionaryProductCard({
  product,
  onInquire,
  onClick
}: RevolutionaryProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const { data: viewCounts } = useEntityViewCounts('product', product.id);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 600);
  };

  const handleInquire = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInquire?.(product);
  };

  const handleCardClick = () => {
    onClick?.(product);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTiltX(rotateX);
    setTiltY(rotateY);
  };

  const handleMouseLeave = () => {
    setTiltX(0);
    setTiltY(0);
  };

  const discountPercent = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const isInStock = product.is_active && (
    !product.inventory_tracking || 
    product.stock_quantity === null || 
    product.stock_quantity > 0
  );
  const productImage = product.images?.[0] || '/placeholder.svg';
  const shopName = product.shops?.name || 'Unknown Shop';

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="glass-card spatial-card h-full flex flex-col cursor-pointer group relative overflow-hidden"
        style={{
          borderRadius: 'var(--radius-2xl)',
          transformStyle: 'preserve-3d',
        }}
        animate={{
          rotateX: tiltX,
          rotateY: tiltY,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={handleCardClick}
      >
        {/* Glassmorphism Background Layer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-cosmic opacity-20" />
        </div>

        {/* Floating Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-cosmic rounded-[2.5rem] opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Image Container with 3D Depth */}
          <div className="relative overflow-hidden" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}>
            <ResponsiveImage
              src={productImage}
              alt={product.name}
              size="square"
              className="group-hover:scale-125 transition-transform duration-700 ease-out"
            />

            {/* Dynamic Gradient Overlay */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)'
              }}
            />

            {/* Sparkle Effect on Hover */}
            <motion.div
              className="absolute top-4 left-4 opacity-0 group-hover:opacity-100"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-lg" />
            </motion.div>

            {/* Premium Favorite Button with Touch Feedback */}
            <motion.button
              className="touch-feedback absolute top-3 right-3 w-12 h-12 rounded-full flex items-center justify-center touch-target"
              style={{
                background: isFavorite
                  ? 'linear-gradient(135deg, hsl(330, 85%, 60%), hsl(0, 85%, 65%))'
                  : 'var(--glass-strong)',
                backdropFilter: 'blur(20px)',
                boxShadow: isFavorite ? 'var(--glow-pink)' : 'var(--shadow-md)',
              }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleFavorite}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite ? 'fill-white text-white' : 'text-gray-700'
                } ${isHeartAnimating ? 'micro-bounce' : ''}`}
              />
            </motion.button>

            {/* Out of Stock Glassmorphism Overlay */}
            {!isInStock && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 glass-card-strong flex items-center justify-center"
              >
                <Badge
                  className="text-base font-bold px-6 py-2.5 rounded-full shadow-xl border-2 border-white/30"
                  style={{
                    background: 'linear-gradient(135deg, hsl(0, 85%, 65%), hsl(15, 90%, 55%))',
                    color: 'white'
                  }}
                >
                  Out of Stock
                </Badge>
              </motion.div>
            )}

            {/* Premium Discount Badge with Glow */}
            {discountPercent > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="absolute top-3 left-3"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-fire rounded-full blur-lg opacity-60" />
                  <Badge
                    className="relative text-base font-black px-4 py-2 rounded-full shadow-2xl border-2 border-white/40"
                    style={{
                      background: 'linear-gradient(135deg, hsl(25, 95%, 60%), hsl(45, 100%, 55%))',
                      color: 'white'
                    }}
                  >
                    <Zap className="w-4 h-4 inline mr-1" />
                    {discountPercent}% OFF
                  </Badge>
                </div>
              </motion.div>
            )}

            {/* View Count with Glass Effect */}
            {viewCounts && viewCounts.view_count > 0 && (
              <div
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{
                  background: 'var(--glass-strong)',
                  backdropFilter: 'blur(var(--blur-base))',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Eye className="w-3.5 h-3.5 text-gray-700" />
                <span className="text-xs font-bold text-gray-800">{viewCounts.view_count}</span>
              </div>
            )}
          </div>

          {/* Content Section with Glassmorphism */}
          <div className="p-5 flex-1 flex flex-col gap-3 relative">
            {/* Subtle Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" style={{ borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }} />

            {/* Product Name with Gradient Text */}
            <h4 className="font-black text-lg line-clamp-2 leading-tight relative z-10"
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  color: 'hsl(230, 25%, 12%)'
                }}>
              {product.name}
            </h4>

            {/* Shop Name with Icon */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 relative z-10">
              <div className="w-6 h-6 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-xs">
                {shopName.charAt(0).toUpperCase()}
              </div>
              <span className="line-clamp-1">{shopName}</span>
            </div>

            {/* Price Section with Enhanced Typography */}
            <div className="mt-auto pt-3 relative z-10">
              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className="text-3xl font-black text-gradient-cosmic"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  ₹{product.price.toLocaleString()}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-gray-500 line-through font-bold">
                    ₹{product.compare_at_price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Revolutionary CTA Button with Glassmorphism */}
              <Button
                size="lg"
                className="w-full h-14 text-base font-black rounded-full relative overflow-hidden group/btn touch-feedback shadow-xl border-2 border-white/30"
                style={{
                  background: isInStock
                    ? 'linear-gradient(135deg, hsl(270, 95%, 65%), hsl(330, 85%, 60%))'
                    : 'var(--glass-base)',
                  color: isInStock ? 'white' : 'hsl(230, 25%, 40%)',
                }}
                disabled={!isInStock}
                onClick={handleInquire}
              >
                {/* Button Glow Effect */}
                {isInStock && (
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                )}

                {isInStock ? (
                  <>
                    <MessageCircleHeart className="w-5 h-5 mr-2" />
                    Inquire
                  </>
                ) : (
                  'Unavailable'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Particles Effect (Premium) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{
                x: Math.random() * 100 + '%',
                y: '100%',
                opacity: 0,
              }}
              animate={{
                y: '-10%',
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
