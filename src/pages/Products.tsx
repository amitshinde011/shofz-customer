import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, X, Grid3x3, List, ChevronRight, TrendingUp, MapPin } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import FilterSheet, { FilterState } from "@/components/FilterSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useInfiniteProducts, useProductCategories, useUserFavoriteProducts, useToggleProductFavorite } from "@/hooks/useProducts";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import { Product } from "@/services/productService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLocation } from "@/contexts/LocationContext";
import { useShop } from "@/hooks/useShops";
import { calculateDistance } from "@/lib/distanceCalculation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type SortOption = "relevance" | "price-low" | "price-high" | "distance" | "rating" | "newest";

export default function Products() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const { toast } = useToast();
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [0, 50000],
    distance: 50,
    rating: 0,
    inStockOnly: false,
    hasDelivery: false,
    isOpen: false,
    minReviews: 0,
  });

  const prevUrlFeaturedRef = useRef<boolean | null>(null);

  // Single effect: URL → State (source of truth)
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    
    const urlCategory = searchParams.get('category');
    if (urlCategory) {
      setSelectedCategory(urlCategory);
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

  // Fetch products with real-time search using infinite query
  const productSearchOptions = useMemo(() => ({
    query: debouncedQuery || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    minPrice: filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
    maxPrice: filters.priceRange[1] < 50000 ? filters.priceRange[1] : undefined,
    shopId: selectedShop || undefined,
    location: location ? { 
      lat: location.lat, 
      lng: location.lng, 
      radius: filters.distance
    } : undefined,
    limit: 20,
  }), [debouncedQuery, selectedCategory, filters, location, selectedShop]);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts(productSearchOptions);
  const { data: categoriesResponse } = useProductCategories();
  const { data: favoriteProductsResponse } = useUserFavoriteProducts();
  const toggleProductFavoriteMutation = useToggleProductFavorite();
  const { user, isAuthenticated  } = useAuth();
  const { data: shopData } = useShop(selectedShop ?? 'NO_SHOP');

  const products = useMemo(() => {
    return infiniteData?.pages.flatMap(page => page.data || []) || [];
  }, [infiniteData]);
  const categories = categoriesResponse?.data || [];
  
  const favoriteProductIds = new Set(
    favoriteProductsResponse?.data?.map(fav => fav.product_id) || []
  );

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Featured filter
    if (featuredOnly) {
      filtered = filtered.filter(product => product.is_featured === true);
    }

    // Additional client-side filtering for advanced filters
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product =>
        filters.categories.includes(product.category || '')
      );
    }

    // Stock filter (server doesn't filter this yet)
    if (filters.inStockOnly) {
      filtered = filtered.filter(product =>
        product.is_active && (
          !product.inventory_tracking || 
          product.stock_quantity === null || 
          product.stock_quantity > 0
        )
      );
    }

    // Open now filter (requires shop business hours)
    if (filters.isOpen) {
      filtered = filtered.filter(product => {
        const shop = product.shops as any;
        if (!shop?.business_hours) return false;
        
        // Check if shop is currently open
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        const currentTime = now.toTimeString().slice(0, 5); // 'HH:MM'
        
        const todayHours = shop.business_hours?.[currentDay];
        if (!todayHours || todayHours.closed) return false;
        
        return currentTime >= todayHours.open && currentTime <= todayHours.close;
      });
    }

    // Rating filter (filter by shop rating)
    if (filters.rating > 0) {
      filtered = filtered.filter(product => {
        const shop = product.shops as any;
        return (shop?.rating || 0) >= filters.rating;
      });
    }

    // Minimum reviews filter
    if (filters.minReviews && filters.minReviews > 0) {
      filtered = filtered.filter(product => {
        const shop = product.shops as any;
        return (shop?.total_reviews || 0) >= filters.minReviews;
      });
    }

    // Sort products with featured priority
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by price
          return a.price - b.price;
        });
        break;
      case "price-high":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by price
          return b.price - a.price;
        });
        break;
      case "rating":
        filtered.sort((a, b) => {
          // Featured first
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          // Then by shop rating (products inherit shop rating)
          const aRating = (a.shops as any)?.rating || 0;
          const bRating = (b.shops as any)?.rating || 0;
          return bRating - aRating;
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
            // Then by shop distance
            const aShopLocation = (a.shops as any)?.location;
            const bShopLocation = (b.shops as any)?.location;
            
            if (!aShopLocation || !bShopLocation) return 0;
            
            const distA = calculateDistance(location, aShopLocation);
            const distB = calculateDistance(location, bShopLocation);
            return distA - distB;
          });
        }
        break;
      default: // relevance
        filtered.sort((a, b) => {
          // Featured first for relevance
          if (a.is_featured !== b.is_featured) {
            return a.is_featured ? -1 : 1;
          }
          return 0;
        });
        break;
    }

    return filtered;
  }, [products, filters, sortBy, location, featuredOnly]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    // Don't count isFeatured since it's displayed separately
    if (filters.categories.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 50000) count++;
    if (filters.distance < 50) count++;
    if (filters.rating > 0) count++;
    if (filters.inStockOnly) count++;
    if (filters.hasDelivery) count++;
    if (filters.isOpen) count++;
    if (filters.minReviews && filters.minReviews > 0) count++;
    return count;
  }, [filters]);

  const clearCategoryFilter = () => {
    setSelectedCategory("all");
  };

  const handleInquire = (product: Product) => {
    if (!isAuthenticated) {
      toast({ description: 'Please sign in to inquire about this product' });
      return;
    }

    const params = new URLSearchParams({
      productId: product.id,
      product_name: product.name,
      shop_id: product.shop_id,
    });

    const isOutOfStock = !product.is_active || (
      product.inventory_tracking && 
      product.stock_quantity !== null && 
      product.stock_quantity === 0
    );
    
    if (isOutOfStock) {
      params.append('type', 'availability');
    }

    navigate(`/inquiry/new?${params.toString()}`);
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
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full">
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
                <BreadcrumbPage className="font-semibold">Products</BreadcrumbPage>
              </BreadcrumbItem>
              {selectedCategory !== "all" && (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold">{selectedCategory}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
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
                {selectedCategory !== "all" ? selectedCategory : "All Products"}
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
              placeholder="Search for products, shops, or services..."
            />
          </div>

          {/* Category Filter Chips - Instagram Style */}
          <div className="flex space-x-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
            <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                size="sm"
                className={`whitespace-nowrap shrink-0 rounded-full font-medium text-xs h-9 px-3 transition-all duration-300 touch-target ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  : "hover:bg-accent"
              }`}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className={`whitespace-nowrap shrink-0 rounded-full font-medium text-xs h-9 px-3 transition-all duration-300 touch-target ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    : "hover:bg-accent"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Active Filters Display */}
      {(featuredOnly || selectedShop || selectedCategory !== "all" || activeFilterCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 mt-2"
            >
              <span className="text-sm font-semibold text-muted-foreground">Active filters:</span>

              {featuredOnly && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Featured Products
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFeaturedOnly(false);
                    setFilters(prev => ({ ...prev, isFeatured: false }));
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('featured');
                    navigate(newParams.toString() ? `/products?${newParams.toString()}` : '/products', { replace: true });
                  }} />
                </Badge>
              )}

              {selectedShop && shopData?.data && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Shop: {shopData.data.name}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => setSelectedShop(null)} />
                </Badge>
              )}

              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  {selectedCategory}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={clearCategoryFilter} />
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

              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 50000) && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  ₹{filters.priceRange[0].toLocaleString()} - ₹{filters.priceRange[1].toLocaleString()}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, priceRange: [0, 50000] }));
                  }} />
                </Badge>
              )}

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

              {filters.inStockOnly && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  In Stock Only
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => {
                    setFilters(prev => ({ ...prev, inStockOnly: false }));
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

              {(selectedShop || selectedCategory !== "all" || activeFilterCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
            onClick={() => {
              setSelectedShop(null);
              setSelectedCategory("all");
              setFeaturedOnly(false);
              setFilters({
                categories: [],
                priceRange: [0, 50000],
                distance: 50,
                rating: 0,
                inStockOnly: false,
                isFeatured: false,
                hasDelivery: false,
                isOpen: false,
                minReviews: 0,
              });
              navigate('/products', { replace: true });
            }}
                  className="h-7 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </motion.header>

      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-screen-2xl mx-auto">
        {/* Results Header with Sort - Instagram Style */}
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
                {isLoading ? "Searching..." : `${filteredAndSortedProducts.length} results`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSheet
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                if (newFilters.isFeatured !== filters.isFeatured) {
                  const newParams = new URLSearchParams(searchParams);
                  if (newFilters.isFeatured) {
                    newParams.set('featured', 'true');
                  } else {
                    newParams.delete('featured');
                  }
                  navigate(newParams.toString() ? `/products?${newParams.toString()}` : '/products', { replace: true });
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
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                {/*<SelectItem value="rating">Customer Rating</SelectItem>*/}
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Loading Skeleton - Instagram Style */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3"
              >
                <Skeleton className="aspect-square w-full rounded-xl" />
                <div className="space-y-2 px-1">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-3/4 rounded-full" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Products Grid with Infinite Scroll */}
        {!isLoading && filteredAndSortedProducts.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid-products grid-gap"
            >
              {filteredAndSortedProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <ProductCard
                    product={product}
                    onClick={() => navigate(`/products/${product.id}`)}
                    onInquire={() => handleInquire(product)}
                    isFavorite={favoriteProductIds.has(product.id)}
                    onToggleFavorite={(productId) => {
                      const isFavorited = favoriteProductIds.has(productId);
                      toggleProductFavoriteMutation.mutate({ productId, isFavorited });
                    }}
                  />
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
              loadingText="Loading more products..."
              endText="No more products to load"
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
              Enable location to discover products from nearby shops in your area
            </p>
            <Button onClick={requestLocation} size="lg">
              <MapPin className="w-4 h-4 mr-2" />
              Enable Location
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {location && !isLoading && filteredAndSortedProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Products Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery.trim() 
                ? `No results found for "${searchQuery}". Try different keywords or adjust your filters.`
                : "Try adjusting your filters or browse different categories"
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => { 
                  setSearchQuery(""); 
                  setSelectedCategory("all");
                  setFilters({
                    categories: [],
                    priceRange: [0, 50000],
                    distance: 50,
                    rating: 0,
                    inStockOnly: false,
                  });
                }}
              >
                Clear All Filters
              </Button>
              {searchQuery.trim() && (
                <Button 
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}