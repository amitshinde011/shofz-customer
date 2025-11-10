import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, X, Grid3x3, List, ChevronRight, Tag, MapPin } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import OfferCard from "@/components/OfferCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteOffers } from "@/hooks/useOffers";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import OfferFilterSheet, { OfferFilterState } from "@/components/OfferFilterSheet";
import { useUserLocation } from "@/contexts/LocationContext";
import { useShop } from "@/hooks/useShops";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { calculateDistance } from "@/lib/distanceCalculation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type SortOption = "nearest" | "newest" | "ending-soon" | "discount-high" | "discount-low";

const defaultFilters: OfferFilterState = {
  offerTypes: [],
  discountRange: [0, 100],
  categories: [],
  shops: [],
  minDiscount: 0,
};

export default function Offers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("nearest");
  const [filters, setFilters] = useState<OfferFilterState>(defaultFilters);
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const prevUrlFeaturedRef = useRef<boolean | null>(null);

  // Single effect: URL → State (source of truth)
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    
    const urlShopId = searchParams.get('shop');
    if (urlShopId) {
      setSelectedShop(urlShopId);
    }

    const urlFeatured = searchParams.get('featured') === 'true';
    
    // Only update if URL actually changed (not on every render)
    if (prevUrlFeaturedRef.current !== urlFeatured) {
      prevUrlFeaturedRef.current = urlFeatured;
      setFeaturedOnly(urlFeatured);
      setFilters(prev => ({ ...prev, isFeatured: urlFeatured }));
    }
  }, [searchParams]); // Only depend on searchParams

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch offers using infinite query
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteOffers({
    active: true,
    shopId: selectedShop || undefined,
    location: location ? { lat: location.lat, lng: location.lng, radius: 50 } : undefined,
  });

  // Pull to refresh
  const handleRefresh = async () => {
    await refetch();
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  const { data: shopData } = useShop(selectedShop ?? 'NO_SHOP');

  const offers = useMemo(() => {
    return infiniteData?.pages.flatMap(page => page.data || []) || [];
  }, [infiniteData]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.offerTypes.length > 0) count++;
    if (filters.discountRange[0] > 0 || filters.discountRange[1] < 100) count++;
    if (filters.categories.length > 0) count++;
    if (filters.shops.length > 0) count++;
    if (filters.minDiscount > 0) count++;
    if (filters.validFrom) count++;
    if (filters.validUntil) count++;
    return count;
  }, [filters]);

  // Extract unique categories and shops for filters
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    offers.forEach(offer => {
      offer.applicable_categories?.forEach(cat => categories.add(cat));
    });
    return Array.from(categories);
  }, [offers]);

  const availableShops = useMemo(() => {
    const shops = offers
      .filter(offer => offer.shops)
      .map(offer => ({ id: offer.shop_id, name: offer.shops!.name }));
    return Array.from(new Map(shops.map(s => [s.id, s])).values());
  }, [offers]);

  const filteredAndSortedOffers = useMemo(() => {
    let filtered = [...offers];

    // Featured filter
    if (featuredOnly) {
      filtered = filtered.filter(offer => offer.is_featured === true);
    }

    // Client-side search filter
    if (debouncedQuery) {
      filtered = filtered.filter(offer => {
        const matchesSearch = offer.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                             (offer.shops?.name || "").toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                             (offer.description || "").toLowerCase().includes(debouncedQuery.toLowerCase());
        return matchesSearch;
      });
    }

    // Apply offer type filter
    if (filters.offerTypes.length > 0) {
      filtered = filtered.filter(offer => 
        filters.offerTypes.includes(offer.offer_type)
      );
    }

    // Apply discount range filter
    if (filters.discountRange[0] > 0 || filters.discountRange[1] < 100) {
      filtered = filtered.filter(offer => 
        offer.discount_value >= filters.discountRange[0] && 
        offer.discount_value <= filters.discountRange[1]
      );
    }

    // Apply minimum discount filter
    if (filters.minDiscount > 0) {
      filtered = filtered.filter(offer => offer.discount_value >= filters.minDiscount);
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(offer =>
        offer.applicable_categories?.some(cat => filters.categories.includes(cat))
      );
    }

    // Apply shop filter
    if (filters.shops.length > 0) {
      filtered = filtered.filter(offer => filters.shops.includes(offer.shop_id));
    }

    // Apply date range filters
    if (filters.validFrom) {
      filtered = filtered.filter(offer => {
        if (!offer.valid_from) return true;
        return new Date(offer.valid_from) >= filters.validFrom!;
      });
    }

    if (filters.validUntil) {
      filtered = filtered.filter(offer => {
        if (!offer.valid_until) return true;
        return new Date(offer.valid_until) <= filters.validUntil!;
      });
    }

    // Sort offers with featured priority
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      case "ending-soon":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by ending soon
          if (!a.valid_until || !b.valid_until) return 0;
          return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime();
        });
        break;
      case "discount-high":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by discount
          return b.discount_value - a.discount_value;
        });
        break;
      case "discount-low":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by discount
          return a.discount_value - b.discount_value;
        });
        break;
      default: // nearest (with featured priority)
        if (location) {
          filtered.sort((a, b) => {
            // Featured first
            if (a.is_featured !== b.is_featured) {
              return a.is_featured ? -1 : 1;
            }
            // Then by shop distance
            const aShopLocation = (a.shops as any)?.location;
            const bShopLocation = (b.shops as any)?.location;
            
            if (!aShopLocation || !bShopLocation) return 0;
            
            const distA = calculateDistance(location, aShopLocation);
            const distB = calculateDistance(location, bShopLocation);
            return distA - distB;
          });
        } else {
          // No location: just featured first, keep rest as-is
          filtered.sort((a, b) => {
            if (a.is_featured !== b.is_featured) {
              return a.is_featured ? -1 : 1;
            }
            return 0;
          });
        }
        break;
    }

    return filtered;
  }, [offers, debouncedQuery, sortBy, filters, featuredOnly]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div 
      ref={pullToRefresh.scrollContainerRef}
      className="min-h-screen bg-background pb-20 overflow-x-hidden overflow-y-auto w-full max-w-full"
    >
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        isReady={pullToRefresh.isReady}
      />
      
      {/* Breadcrumbs - Amazon Style */}
      <div className="bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-screen-2xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">Offers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header - Amazon Style */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/90 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-page-title text-foreground font-inter">
                Today's Deals
              </h1>
              {location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Within 50km of your location</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="mb-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search offers, shops..."
            />
          </div>

          {/* Active Filters Display */}
          {(featuredOnly || selectedShop || activeFilterCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-sm font-semibold text-muted-foreground">Active filters:</span>
              
              {featuredOnly && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Featured Offers
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFeaturedOnly(false);
                    setFilters(prev => ({ ...prev, isFeatured: false }));
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('featured');
                    navigate(newParams.toString() ? `/offers?${newParams.toString()}` : '/offers', { replace: true });
                  }} />
                </Badge>
              )}

              {selectedShop && shopData?.data && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Shop: {shopData.data.name}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => setSelectedShop(null)} />
                </Badge>
              )}

              {filters.offerTypes.length > 0 && filters.offerTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      offerTypes: prev.offerTypes.filter(t => t !== type)
                    }));
                  }} />
                </Badge>
              ))}

              {filters.categories.length > 0 && filters.categories.map((category) => (
                <Badge key={category} variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  {category}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      categories: prev.categories.filter(c => c !== category)
                    }));
                  }} />
                </Badge>
              ))}

              {filters.shops.length > 0 && filters.shops.map((shop) => (
                <Badge key={shop} variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Shop: {shop}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      shops: prev.shops.filter(s => s !== shop)
                    }));
                  }} />
                </Badge>
              ))}

              {(filters.discountRange[0] > 0 || filters.discountRange[1] < 100) && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Discount: {filters.discountRange[0]}% - {filters.discountRange[1]}%
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, discountRange: [0, 100] }));
                  }} />
                </Badge>
              )}

              {filters.minDiscount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Min {filters.minDiscount}% off
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, minDiscount: 0 }));
                  }} />
                </Badge>
              )}

              {filters.validFrom && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  From: {new Date(filters.validFrom).toLocaleDateString()}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, validFrom: undefined }));
                  }} />
                </Badge>
              )}

              {filters.validUntil && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Until: {new Date(filters.validUntil).toLocaleDateString()}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, validUntil: undefined }));
                  }} />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
            onClick={() => {
              setSelectedShop(null);
              setFeaturedOnly(false);
              setFilters(defaultFilters);
              navigate('/offers', { replace: true });
            }}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </motion.div>
          )}
        </div>
      </motion.header>

      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-screen-2xl mx-auto">
        {/* Results Header with Sort */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
        >
          <div className="flex flex-col gap-1">
            {searchQuery.trim() && (
              <p className="text-base font-bold text-foreground">
                Results for "{searchQuery}"
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground font-medium">
                {isLoading ? "Searching..." : `${filteredAndSortedOffers.length} results`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <OfferFilterSheet
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                
                // Sync featured filter
                if (newFilters.isFeatured !== featuredOnly) {
                  setFeaturedOnly(newFilters.isFeatured || false);
                  
                  // Update URL
                  const newParams = new URLSearchParams(searchParams);
                  if (newFilters.isFeatured) {
                    newParams.set('featured', 'true');
                  } else {
                    newParams.delete('featured');
                  }
                  
                  const newSearch = newParams.toString();
                  const newPath = newSearch ? `/offers?${newSearch}` : '/offers';
                  navigate(newPath, { replace: true });
                }
              }}
              activeFilterCount={activeFilterCount}
              availableCategories={availableCategories}
              availableShops={availableShops}
            />

            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[140px] rounded-full font-medium text-xs h-8">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest First</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="discount-high">Discount: High to Low</SelectItem>
                <SelectItem value="discount-low">Discount: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} variants={itemVariants}>
                <div className="bg-card rounded-lg p-4">
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Offers Grid with Infinite Scroll */}
        {!isLoading && filteredAndSortedOffers.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid-offers grid-gap"
            >
              {filteredAndSortedOffers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <OfferCard offer={offer} variant="default" />
                </motion.div>
              ))}
            </motion.div>

            <InfiniteScrollTrigger
              onLoadMore={() => fetchNextPage()}
              hasMore={hasNextPage}
              isLoading={isFetchingNextPage}
              threshold={300}
            />

            <InfiniteScrollLoader
              isLoading={isFetchingNextPage}
              hasMore={hasNextPage}
              loadingText="Loading more offers..."
              endText="No more offers to load"
            />
          </>
        )}

        {/* Location Required State */}
        {!location && !locationLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
          >
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Location Required</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enable location to discover deals from nearby shops in your area
            </p>
            <Button onClick={requestLocation} size="lg">
              <MapPin className="w-4 h-4 mr-2" />
              Enable Location
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {location && !isLoading && filteredAndSortedOffers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Offers Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery.trim()
                ? `No results found for "${searchQuery}". Try different keywords.`
                : "No offers available at the moment"
              }
            </p>
            <Button onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}