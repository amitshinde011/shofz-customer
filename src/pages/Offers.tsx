import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, X, Grid3x3, List, ChevronRight, Tag, MapPin } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import OfferCard from "@/components/OfferCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffers } from "@/hooks/useOffers";
import OfferFilterSheet, { OfferFilterState } from "@/components/OfferFilterSheet";
import { useUserLocation } from "@/contexts/LocationContext";
import { useShop } from "@/hooks/useShops";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type SortOption = "relevance" | "newest" | "ending-soon" | "discount-high" | "discount-low";

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
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<OfferFilterState>(defaultFilters);
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // Apply search query and featured filter from URL on mount
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    
    const urlShopId = searchParams.get('shop');
    if (urlShopId) {
      setSelectedShop(urlShopId);
    }

    const isFeatured = searchParams.get('featured') === 'true';
    setFeaturedOnly(isFeatured);
  }, [searchParams]);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all active offers
  const { data: offersResponse, isLoading } = useOffers({
    active: true,
    shopId: selectedShop || undefined,
    location: location ? { lat: location.lat, lng: location.lng, radius: 50 } : undefined,
    limit: 100,
  });

  const { data: shopData } = useShop(selectedShop || '');

  const offers = offersResponse?.data || [];

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
  }, [offers, debouncedQuery, sortBy, filters, featuredOnly]);

  // Pagination logic
  const totalOffers = filteredAndSortedOffers.length;
  const totalPages = Math.ceil(totalOffers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOffers = filteredAndSortedOffers.slice(startIndex, endIndex);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (featuredOnly) count++;
    if (filters.offerTypes.length > 0) count++;
    if (filters.discountRange[0] > 0 || filters.discountRange[1] < 100) count++;
    if (filters.categories.length > 0) count++;
    if (filters.shops.length > 0) count++;
    if (filters.minDiscount > 0) count++;
    if (filters.validFrom) count++;
    if (filters.validUntil) count++;
    return count;
  }, [filters, featuredOnly]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filters, featuredOnly]);

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
          {(selectedShop || activeFilterCount > 0) && (
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
                    navigate('/offers');
                  }} />
                </Badge>
              )}

              {selectedShop && shopData?.data && (
                <Badge variant="secondary" className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                  Shop: {shopData.data.name}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => setSelectedShop(null)} />
                </Badge>
              )}
              
              {activeFilterCount > (featuredOnly ? 1 : 0) + (selectedShop ? 1 : 0) && (
                <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
                  {activeFilterCount - (featuredOnly ? 1 : 0) - (selectedShop ? 1 : 0)} more filter{activeFilterCount > (featuredOnly ? 2 : 1) + (selectedShop ? 1 : 0) ? 's' : ''}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedShop(null);
                  setFeaturedOnly(false);
                  setFilters(defaultFilters);
                  navigate('/offers');
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
                {isLoading ? "Searching..." : (
                  <>
                    <span className="font-bold text-foreground">
                      {totalOffers} results
                    </span>
                  </>
                )}
              </p>
              {!isLoading && totalOffers > 0 && (
                <span className="text-xs text-muted-foreground">
                  (Page {currentPage} of {totalPages})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Items Per Page */}
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-[90px] text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>

            <OfferFilterSheet
              filters={filters}
              onFiltersChange={setFilters}
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
                <SelectItem value="relevance">Relevance</SelectItem>
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

        {/* Offers Grid */}
        {!isLoading && paginatedOffers.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-offers grid-gap"
          >
            {paginatedOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                variants={itemVariants}
                custom={index}
              >
                <OfferCard offer={offer} variant="default" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination - Amazon Style */}
        {!isLoading && totalPages > 1 && paginatedOffers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-2 mt-12"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, index, array) => (
                <div key={page} className="flex items-center gap-2">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "bg-primary text-primary-foreground" : ""}
                  >
                    {page}
                  </Button>
                </div>
              ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </motion.div>
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