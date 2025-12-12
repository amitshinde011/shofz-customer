import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ChevronRight, MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "react-router-dom";
import * as Icons from "lucide-react";
import { useShopCategories, useShops } from "@/hooks/useShops";
import { useSmartOffers } from "@/hooks/useSmartOffers";
import { useAuth } from "@/contexts/AuthContext";
import { useFeaturedShops, useFeaturedProducts, useFeaturedOffers } from "@/hooks/useFeaturedContent";
import OfferStoriesCarousel from "@/components/OfferStoriesCarousel";
import { HomeHeader } from "@/components/HomeHeader";
import ProductCard from "@/components/ProductCard";
import OfferCard from "@/components/OfferCard";
import ShopCard from "@/components/ShopCard";
import { FeaturedShopCard } from "@/components/FeaturedShopCard";
import { FeaturedProductCard } from "@/components/FeaturedProductCard";
import { FeaturedOfferCard } from "@/components/FeaturedOfferCard";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { useUserLocation } from "@/contexts/LocationContext";
import { calculateShopStatus } from "@/lib/businessHours";
import { calculateDistance, formatDistance } from "@/lib/distanceCalculation";
import { AdBannerCarousel } from "@/components/AdBannerCarousel";
import { AdBanner } from "@/components/AdBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { useQueryClient } from "@tanstack/react-query";

// Helper function to get icon for category
const getCategoryIcon = (categoryName: string): keyof typeof Icons => {
  const iconMap: Record<string, keyof typeof Icons> = {
    "Electronics": "Smartphone",
    "Groceries": "ShoppingCart",
    "Fashion": "Shirt",
    "Pharmacy": "Cross",
    "Restaurants": "UtensilsCrossed",
    "Furniture": "Sofa",
    "Books": "BookOpen",
    "Sports": "Dumbbell",
    "Toys": "Puzzle",
    "Hardware": "Wrench",
    "Bakery": "Croissant",
    "Jewelry": "Gem",
    "Beauty": "Sparkles",
    "Automotive": "Car",
    "Pets": "Dog",
  };
  return iconMap[categoryName] || "Store";
};

export default function Home() {
  const { user } = useAuth();
  const { location } = useUserLocation();
  const queryClient = useQueryClient();
  
  const locationParams = location ? { lat: location.lat, lng: location.lng, radius: 50 } : undefined;
  
  // Fetch enough items for 3 rows × 5 columns (max large desktop view)
  const { data: featuredShopsData } = useFeaturedShops(15, locationParams);
  const { data: featuredProductsData } = useFeaturedProducts(15, locationParams);
  const { data: featuredOffersData } = useFeaturedOffers(15, locationParams);
  
  // Smart offers with favorites first, distance sorting, and infinite scroll
  const { 
    offers: smartOffers, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isSmartOffersLoading,
    error: smartOffersError,
  } = useSmartOffers({ location: locationParams, initialLimit: 15 });
  
  const { data: categoriesResponse } = useShopCategories();
  const { data: shopsResponse } = useShops({ 
    location: locationParams,
    limit: 10 
  });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['featured-shops'] }),
      queryClient.invalidateQueries({ queryKey: ['featured-products'] }),
      queryClient.invalidateQueries({ queryKey: ['featured-offers'] }),
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: ['smart-offers'] }),
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['shops'] }),
    ]);
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  const shopCategories = categoriesResponse?.data || [];
  const rawFeaturedShops = featuredShopsData?.data || [];
  const featuredProducts = featuredProductsData?.data || [];
  const featuredOffers = featuredOffersData?.data || [];
  const allShops = shopsResponse?.data || [];
  
  // Transform featured shops to include location object for FeaturedShopCard
  const featuredShops = rawFeaturedShops.map(shop => ({
    ...shop,
    location: shop.latitude && shop.longitude ? { lat: shop.latitude, lng: shop.longitude } : null
  }));
  
  // Filter out featured shops from regular shops list and transform for ShopCard
  const featuredShopIds = new Set(featuredShops.map(shop => shop.id));
  const regularShops = allShops
    .filter(shop => !featuredShopIds.has(shop.id))
    .slice(0, 5)
    .map(shop => {
      const shopStatus = calculateShopStatus(shop.business_hours);
      return {
        id: shop.id,
        name: shop.name,
        image: shop.logo_url || '/placeholder.svg',
        category: shop.categories?.[0] || 'Shop',
        categories: shop.categories || [],
        rating: shop.rating || 0,
        distance: shop.distance_km ? formatDistance(shop.distance_km) : 'N/A',
        address: shop.address || '',
        isOpen: shopStatus.isOpen,
        nextStatusChange: shopStatus.nextStatusChange,
        isFavorite: false,
        coordinates: shop.latitude && shop.longitude ? { lat: shop.latitude, lng: shop.longitude } : null,
        phone: shop.phone_number || '',
        reviewCount: shop.total_reviews || 0,
        delivery_available: shop.delivery_available,
        delivery_coverage_km: shop.delivery_coverage_km,
        delivery_charge_per_km: shop.delivery_charge_per_km,
        free_delivery_above: shop.free_delivery_above,
        delivery_notes: shop.delivery_notes,
        distance_km: shop.distance_km,
      };
    });

  return (
    <div 
      ref={pullToRefresh.scrollContainerRef}
      className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full"
    >
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        isReady={pullToRefresh.isReady}
      />
      {/* Amazon-Inspired Header */}
      <HomeHeader />

      {/* Offer Stories Carousel - Instagram Style with Smart Sorting */}
      {(smartOffers.length > 0 || isSmartOffersLoading) && (
        <div className="py-3 sm:py-4 bg-background">
          <OfferStoriesCarousel 
            offers={smartOffers} 
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            isLoading={isSmartOffersLoading}
            error={smartOffersError}
          />
        </div>
      )}

      {/* Advertisement Carousel - Top of page */}
      <AdBannerCarousel placement="home-top" />

      <div className="max-w-screen-xl mx-auto page-container section-spacing">
        {/* Featured Shops Grid */}
        {featuredShops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section-header text-foreground">
                ⭐ Featured Shops
              </h2>
              <NavLink to="/shops?featured=true">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </NavLink>
            </div>
            <div className="grid-products grid-gap">
              {featuredShops.slice(0, 15).map((shop) => (
                <div key={shop.id}>
                  <FeaturedShopCard shop={shop} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ad Banner after Featured Shops */}
        <AdBanner placement="after-featured-shops" className="my-6" />

        {/* Featured Offers Grid */}
        {featuredOffers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section-header text-foreground">
                🔥 Featured Offers
              </h2>
              <NavLink to="/offers?featured=true">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </NavLink>
            </div>
            <div className="grid-offers grid-gap">
              {featuredOffers.slice(0, 15).map((offer) => (
                <div key={offer.id}>
                  <FeaturedOfferCard offer={offer} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ad Banner after Featured Offers */}
        <AdBanner placement="after-featured-offers" className="my-6" />

        {/* Categories */}
        <section>
          <Card>
            <CardContent className="card-padding">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-section-header text-foreground">
                  Shop by Category
                </h3>
                <NavLink to="/products">
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                    See All
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </NavLink>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                {shopCategories.slice(0, 8).map((category) => {
                  const iconName = getCategoryIcon(category);
                  const IconComponent = Icons[iconName] as any;
                  return (
                    <div key={category}>
                      <NavLink to={`/products?category=${encodeURIComponent(category)}`}>
                        <div className="text-center hover:bg-muted/50 rounded-lg p-2 sm:p-3 transition-colors touch-target">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <p className="text-meta font-medium text-foreground line-clamp-2">
                            {category}
                          </p>
                        </div>
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-section-header text-foreground">
                ✨ Featured Products
              </h3>
              <NavLink to="/products?featured=true">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </NavLink>
            </div>
            <div className="grid-products grid-gap">
              {featuredProducts.map((product) => (
                <div key={product.id}>
                  <FeaturedProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ad Banner after Featured Products */}
        <AdBanner placement="after-featured-products" className="my-6" />

        {/* Hot Deals Section - Uses smart sorted offers */}
        {smartOffers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-section-header text-foreground">
                Hot Deals & Offers
              </h3>
              <NavLink to="/offers">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </NavLink>
            </div>
            <div className="grid-offers grid-gap">
              {smartOffers.slice(0, 6).map((offer) => (
                <div key={offer.id}>
                  <OfferCard offer={offer} hideButton={true} />
                </div>
              ))}
            </div>
          </section>
        )}

        
        {/* Regular Shops - Show non-featured shops */}
        {regularShops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-section-header text-foreground">
                Popular Shops Near You
              </h3>
              <NavLink to="/shops">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-9 touch-target">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </NavLink>
            </div>
            <div className="grid-shops grid-gap">
              {regularShops.map((shop) => (
                <div key={shop.id}>
                  <ShopCard shop={shop} variant="compact" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}