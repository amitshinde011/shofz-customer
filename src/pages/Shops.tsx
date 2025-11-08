import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, List, Map, ArrowUpDown, MapPin, X, ChevronRight, Grid3x3 } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import ShopCard from "@/components/ShopCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useShops, useToggleShopFavorite, useUserFavoriteShops } from "@/hooks/useShops";
import { useAuth } from "@/contexts/AuthContext";
import { Shop } from "@/services/shopService";
import { useUserLocation } from "@/contexts/LocationContext";
import FilterSheet, { FilterState } from "@/components/FilterSheet";
import ShopMap from "@/components/ShopMap";
import { calculateDistance, formatDistance } from "@/lib/distanceCalculation";
import { calculateShopStatus } from "@/lib/businessHours";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type ViewMode = "grid" | "map";
type SortOption = "distance" | "rating" | "newest" | "name";

const defaultFilters: FilterState = {
  categories: [],
  priceRange: [0, 50000],
  distance: 50,
  rating: 0,
  inStockOnly: false,
  hasDelivery: false,
  isOpen: false,
  minReviews: 0,
};

export default function Shops() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { location, error: locationError, requestLocation, openSettings, isNative } = useUserLocation();
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const prevUrlFeaturedRef = useRef<boolean | null>(null);

  // Single effect: URL → State (source of truth)
  useEffect(() => {
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

  // Fetch shops and favorites
  const shopSearchOptions = useMemo(() => ({
    search: debouncedQuery || undefined,
    location: location ? { 
      lat: location.lat, 
      lng: location.lng, 
      radius: filters.distance // Use filter value instead of hardcoded 50
    } : undefined,
    limit: 50,
  }), [debouncedQuery, location?.lat, location?.lng, filters.distance]);

  const { data: shopsResponse, isLoading, refetch } = useShops(shopSearchOptions);
  const { data: favoritesResponse } = useUserFavoriteShops();
  const toggleFavoriteMutation = useToggleShopFavorite();

  // Pull to refresh
  const handleRefresh = async () => {
    await refetch();
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  const shops = shopsResponse?.data || [];
  const favoriteShopIds = favoritesResponse?.data?.map(fav => fav.shop_id) || [];

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    // Don't count isFeatured since it's displayed separately
    if (filters.categories.length > 0) count++;
    if (filters.distance < 50) count++;
    if (filters.rating > 0) count++;
    if (filters.hasDelivery) count++;
    if (filters.isOpen) count++;
    if (filters.minReviews && filters.minReviews > 0) count++;
    return count;
  }, [filters]);

  const filteredAndSortedShops = useMemo(() => {
    let filtered = [...shops];

    // Featured filter
    if (featuredOnly) {
      filtered = filtered.filter(shop => shop.is_featured === true);
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(shop =>
        shop.categories?.some(cat => filters.categories.includes(cat))
      );
    }

    // Apply rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(shop => (shop.rating || 0) >= filters.rating);
    }

    // Apply minimum reviews filter
    if (filters.minReviews && filters.minReviews > 0) {
      filtered = filtered.filter(shop => (shop.total_reviews || 0) >= filters.minReviews);
    }

    // Apply distance filter
    if (location && filters.distance) {
      filtered = filtered.filter(shop => {
        if (!shop.location) return false;
        const distance = calculateDistance(location, shop.location);
        return distance <= filters.distance;
      });
    }

    // Apply open now filter
    if (filters.isOpen) {
      filtered = filtered.filter(shop => {
        const status = calculateShopStatus(shop.business_hours as any);
        return status.isOpen;
      });
    }

    // Sort shops with featured priority
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by rating
          return (b.rating || 0) - (a.rating || 0);
        });
        break;
      case "name":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by name
          return a.name.localeCompare(b.name);
        });
        break;
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
      case "distance":
        if (location) {
          filtered.sort((a, b) => {
            // Featured first
            if (a.is_featured !== b.is_featured) {
              return a.is_featured ? -1 : 1;
            }
            // Then by distance
            if (!a.location || !b.location) return 0;
            const distA = calculateDistance(location, a.location);
            const distB = calculateDistance(location, b.location);
            return distA - distB;
          });
        }
        break;
    }

    return filtered;
  }, [shops, sortBy, filters, location, featuredOnly]);

  const toggleFavorite = (shopId: string) => {
    const isFavorited = favoriteShopIds.includes(shopId);
    toggleFavoriteMutation.mutate({ shopId, isFavorited });
  };

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
                <BreadcrumbPage className="font-semibold">Shops</BreadcrumbPage>
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
            <div>
              <h1 className="text-page-title text-foreground font-inter">Nearby Shops</h1>
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {location
                    ? `Using your location • ${filteredAndSortedShops.length} shops found`
                    : 'Enable location for accurate results'
                  }
                </p>
              </div>
              {locationError && (
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={requestLocation}
                    className="text-xs"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Try Again
                  </Button>
                  {isNative && (locationError.includes('denied') || locationError.includes('disabled')) && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={openSettings}
                      className="text-xs"
                    >
                      Open Settings
                    </Button>
                  )}
                </div>
              )}
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-9 w-9 p-0 touch-target"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className="h-9 w-9 p-0 touch-target"
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="mb-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search shops, services, or categories..."
            />
          </div>

          {/* Active Filters Display */}
          {(featuredOnly || activeFilterCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 mt-2"
            >
              <span className="text-sm font-semibold text-muted-foreground">Active filters:</span>
              {featuredOnly && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Featured Shops
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFeaturedOnly(false);
                    setFilters(prev => ({ ...prev, isFeatured: false }));
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('featured');
                    navigate(newParams.toString() ? `/shops?${newParams.toString()}` : '/shops', { replace: true });
                  }} />
                </Badge>
              )}

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

              {filters.distance < 50 && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Within {filters.distance}km
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, distance: 50 }));
                  }} />
                </Badge>
              )}

              {filters.rating > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Rating ≥ {filters.rating}★
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, rating: 0 }));
                  }} />
                </Badge>
              )}

              {filters.hasDelivery && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Delivery Available
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, hasDelivery: false }));
                  }} />
                </Badge>
              )}

              {filters.isOpen && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Open Now
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, isOpen: false }));
                  }} />
                </Badge>
              )}

              {filters.minReviews && filters.minReviews > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Min {filters.minReviews} reviews
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, minReviews: 0 }));
                  }} />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFeaturedOnly(false);
                  setFilters(defaultFilters);
                  navigate('/shops', { replace: true });
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground font-medium">
                {isLoading ? "Searching..." : (
                  <>
                    <span className="font-bold text-foreground">
                      {filteredAndSortedShops.length} results
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
          <FilterSheet
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
                const newPath = newSearch ? `/shops?${newSearch}` : '/shops';
                navigate(newPath, { replace: true });
              }
            }}
            activeFilterCount={activeFilterCount}
          />

            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[140px] rounded-full font-medium text-xs h-8">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Loading Skeleton - Instagram Style */}
        {isLoading && (
          <div className="grid-shops grid-gap">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="w-full rounded-lg aspect-[16/9]" />
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map View */}
        {!isLoading && viewMode === "map" && (
          <ShopMap shops={filteredAndSortedShops} userLocation={location} />
        )}

        {/* Shops Display - Amazon-style responsive grid */}
        {!isLoading && viewMode !== "map" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-shops grid-gap"
          >
            {filteredAndSortedShops.map((shop) => {
              const distance = location && shop.location
                ? formatDistance(calculateDistance(location, shop.location))
                : 'N/A';

              const shopStatus = calculateShopStatus(shop.business_hours as any);

              return (
                <motion.div key={shop.id} variants={itemVariants}>
                  <ShopCard
                  shop={{
                    id: shop.id,
                    name: shop.name,
                    image: shop.logo_url || '/placeholder.svg',
                    category: shop.categories?.[0] || 'General',
                    subcategories: shop.categories || [],
                    rating: shop.rating || 0,
                    reviewCount: shop.total_reviews || 0,
                    distance,
                    address: shop.address || '',
                    isOpen: shopStatus.isOpen,
                    nextStatusChange: shopStatus.nextStatusChange,
                    delivery: false,
                    deliveryTime: '30-45 min',
                    establishedYear: 2020,
                    phone: shop.phone_number,
                    coordinates: shop.location,
                    isVerified: shop.is_verified,
                    is_featured: shop.is_featured,
                  }}
                    variant="grid"
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favoriteShopIds.includes(shop.id)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty State - No Location */}
        {!location && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Location Required</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {locationError || 'Please enable location access to discover nearby shops and services.'}
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Button onClick={requestLocation}>
                <MapPin className="w-4 h-4 mr-2" />
                Enable Location
              </Button>
              {isNative && locationError && (locationError.includes('denied') || locationError.includes('disabled')) && (
                <Button onClick={openSettings} variant="outline">
                  Open Device Settings
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty State - No Results */}
        {location && !isLoading && filteredAndSortedShops.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Map className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Shops Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery.trim()
                ? `No shops found matching "${searchQuery}". Try different keywords.`
                : "No shops available in your area at the moment."
              }
            </p>
            {searchQuery.trim() && (
              <Button onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
