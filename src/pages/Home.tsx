import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import * as Icons from "lucide-react";
import { useMemo } from "react";
import { useShopCategories } from "@/hooks/useShops";
import { useSmartOffers } from "@/hooks/useSmartOffers";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteFeaturedShops, useInfiniteFeaturedProducts, useInfiniteFeaturedOffers } from "@/hooks/useFeaturedContent";
import OfferStoriesCarousel from "@/components/OfferStoriesCarousel";
import { HomeHeader } from "@/components/HomeHeader";
import OfferCard from "@/components/OfferCard";
import { FeaturedShopCard } from "@/components/FeaturedShopCard";
import { FeaturedProductCard } from "@/components/FeaturedProductCard";
import { FeaturedOfferCard } from "@/components/FeaturedOfferCard";
import { useUserLocation } from "@/contexts/LocationContext";
import { AdBannerCarousel } from "@/components/AdBannerCarousel";
import { AdBanner } from "@/components/AdBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { useQueryClient } from "@tanstack/react-query";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import { Skeleton } from "@/components/ui/skeleton";

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

// Ad placements that cycle
const AD_PLACEMENTS = [
  "after-featured-shops",
  "after-featured-offers", 
  "after-featured-products",
  "home-featured-1",
  "home-featured-2",
];

// Page size for featured content
const FEATURED_PAGE_SIZE = 10;

export default function Home() {
  const { user } = useAuth();
  const { location } = useUserLocation();
  const queryClient = useQueryClient();
  
  // Stabilize locationParams with useMemo to prevent React Query key churn
  const locationParams = useMemo(() => {
    if (!location) return undefined;
    return { lat: location.lat, lng: location.lng, radius: 50 };
  }, [location?.lat, location?.lng]);
  
  // Infinite scroll for featured content
  const { 
    data: shopsData, 
    fetchNextPage: fetchNextShops, 
    hasNextPage: hasMoreShops,
    isFetchingNextPage: isFetchingShops,
    isLoading: isLoadingShops,
    isError: isShopsError,
  } = useInfiniteFeaturedShops(locationParams);

  const { 
    data: productsData, 
    fetchNextPage: fetchNextProducts, 
    hasNextPage: hasMoreProducts,
    isFetchingNextPage: isFetchingProducts,
    isLoading: isLoadingProducts,
    isError: isProductsError,
  } = useInfiniteFeaturedProducts(locationParams);

  const { 
    data: offersData, 
    fetchNextPage: fetchNextOffers, 
    hasNextPage: hasMoreOffers,
    isFetchingNextPage: isFetchingOffers,
    isLoading: isLoadingOffers,
    isError: isOffersError,
  } = useInfiniteFeaturedOffers(locationParams);
  
  // Smart offers with favorites first, distance sorting, and infinite scroll
  const { 
    offers: smartOffers, 
    fetchNextPage: fetchSmartOffers, 
    hasNextPage: hasMoreSmartOffers, 
    isFetchingNextPage: isFetchingSmartOffers,
    isLoading: isSmartOffersLoading,
    error: smartOffersError,
  } = useSmartOffers({ location: locationParams, initialLimit: 15 });
  
  const { data: categoriesResponse } = useShopCategories();

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['infinite-featured-shops'] }),
      queryClient.invalidateQueries({ queryKey: ['infinite-featured-products'] }),
      queryClient.invalidateQueries({ queryKey: ['infinite-featured-offers'] }),
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: ['smart-offers'] }),
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] }),
    ]);
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  const shopCategories = categoriesResponse?.data || [];

  // First page data only - for initial display sections (fixed batch)
  const firstPageShops = useMemo(() => {
    const shops = shopsData?.pages[0]?.data || [];
    return shops.map((shop: any) => ({
      ...shop,
      location: shop.latitude && shop.longitude ? { lat: shop.latitude, lng: shop.longitude } : null
    }));
  }, [shopsData]);

  const firstPageProducts = useMemo(() => {
    return productsData?.pages[0]?.data || [];
  }, [productsData]);

  const firstPageOffers = useMemo(() => {
    return offersData?.pages[0]?.data || [];
  }, [offersData]);

  // All flattened data for additional rounds
  const allFeaturedShops = useMemo(() => {
    const shops = shopsData?.pages.flatMap(page => page.data) || [];
    return shops.map((shop: any) => ({
      ...shop,
      location: shop.latitude && shop.longitude ? { lat: shop.latitude, lng: shop.longitude } : null
    }));
  }, [shopsData]);

  const allFeaturedProducts = useMemo(() => {
    return productsData?.pages.flatMap(page => page.data) || [];
  }, [productsData]);

  const allFeaturedOffers = useMemo(() => {
    return offersData?.pages.flatMap(page => page.data) || [];
  }, [offersData]);

  // Combined infinite load handler
  const handleLoadMore = () => {
    if (hasMoreShops && !isFetchingShops) fetchNextShops();
    if (hasMoreOffers && !isFetchingOffers) fetchNextOffers();
    if (hasMoreProducts && !isFetchingProducts) fetchNextProducts();
  };

  const hasMoreContent = hasMoreShops || hasMoreOffers || hasMoreProducts;
  const isFetchingMore = isFetchingShops || isFetchingOffers || isFetchingProducts;

  // Get ad placement based on page number
  const getAdPlacement = (index: number) => {
    return AD_PLACEMENTS[index % AD_PLACEMENTS.length];
  };

  // Calculate number of "rounds" loaded
  const pageCount = Math.max(
    shopsData?.pages.length || 0,
    productsData?.pages.length || 0,
    offersData?.pages.length || 0
  );

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
            onLoadMore={fetchSmartOffers}
            hasMore={hasMoreSmartOffers}
            isLoadingMore={isFetchingSmartOffers}
            isLoading={isSmartOffersLoading}
            error={smartOffersError}
          />
        </div>
      )}

      {/* Advertisement Carousel - Top of page */}
      <AdBannerCarousel placement="home-top" />

      <div className="max-w-screen-xl mx-auto page-container section-spacing">
        {/* Featured Shops Grid */}
        {(firstPageShops.length > 0 || isLoadingShops) && (
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
              {isLoadingShops ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))
              ) : isShopsError ? (
                <p className="text-destructive col-span-full text-center py-4">Failed to load shops</p>
              ) : (
                firstPageShops.map((shop) => (
                  <div key={shop.id}>
                    <FeaturedShopCard shop={shop} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Ad Banner after Featured Shops */}
        <AdBanner placement="after-featured-shops" className="my-6" />

        {/* Featured Offers Grid */}
        {(firstPageOffers.length > 0 || isLoadingOffers) && (
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
              {isLoadingOffers ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))
              ) : isOffersError ? (
                <p className="text-destructive col-span-full text-center py-4">Failed to load offers</p>
              ) : (
                firstPageOffers.map((offer) => (
                  <div key={offer.id}>
                    <FeaturedOfferCard offer={offer} />
                  </div>
                ))
              )}
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
        {(firstPageProducts.length > 0 || isLoadingProducts) && (
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
              {isLoadingProducts ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))
              ) : isProductsError ? (
                <p className="text-destructive col-span-full text-center py-4">Failed to load products</p>
              ) : (
                firstPageProducts.map((product) => (
                  <div key={product.id}>
                    <FeaturedProductCard product={product} />
                  </div>
                ))
              )}
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


        {/* Additional rounds of featured content with ads */}
        {pageCount > 1 && Array.from({ length: pageCount - 1 }).map((_, roundIndex) => {
          const roundNum = roundIndex + 1;
          const startIdx = roundNum * FEATURED_PAGE_SIZE;
          
          const roundShops = allFeaturedShops.slice(startIdx, startIdx + FEATURED_PAGE_SIZE);
          const roundProducts = allFeaturedProducts.slice(startIdx, startIdx + FEATURED_PAGE_SIZE);
          const roundOffers = allFeaturedOffers.slice(startIdx, startIdx + FEATURED_PAGE_SIZE);
          
          if (roundShops.length === 0 && roundProducts.length === 0 && roundOffers.length === 0) {
            return null;
          }

          return (
            <div key={`round-${roundNum}`}>
              {/* More Featured Shops */}
              {roundShops.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-section-header text-foreground">
                      More Featured Shops
                    </h3>
                  </div>
                  <div className="grid-products grid-gap">
                    {roundShops.map((shop) => (
                      <div key={shop.id}>
                        <FeaturedShopCard shop={shop} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Ad after shops */}
              <AdBanner placement={getAdPlacement(roundNum * 3)} className="my-6" />

              {/* More Featured Offers */}
              {roundOffers.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-section-header text-foreground">
                      More Hot Offers
                    </h3>
                  </div>
                  <div className="grid-offers grid-gap">
                    {roundOffers.map((offer) => (
                      <div key={offer.id}>
                        <FeaturedOfferCard offer={offer} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Ad after offers */}
              <AdBanner placement={getAdPlacement(roundNum * 3 + 1)} className="my-6" />

              {/* More Featured Products */}
              {roundProducts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-section-header text-foreground">
                      More Featured Products
                    </h3>
                  </div>
                  <div className="grid-products grid-gap">
                    {roundProducts.map((product) => (
                      <div key={product.id}>
                        <FeaturedProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Ad after products */}
              <AdBanner placement={getAdPlacement(roundNum * 3 + 2)} className="my-6" />
            </div>
          );
        })}

        {/* Infinite Scroll Trigger */}
        <InfiniteScrollTrigger
          onLoadMore={handleLoadMore}
          enabled={!!location}
          hasMore={hasMoreContent}
          isLoading={isFetchingMore}
        />

        {/* Infinite Scroll Loader */}
        <InfiniteScrollLoader
          isLoading={isFetchingMore}
          hasMore={hasMoreContent}
          loadingText="Loading more featured content..."
          endText="You've seen all featured content"
        />
      </div>
    </div>
  );
}