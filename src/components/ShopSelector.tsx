import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, Star, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopCategories, useShops } from "@/hooks/useShops";
import { shopService } from "@/services/shopService";

interface ShopWithDistance {
  id: string;
  name: string;
  categories: string[];
  address?: string;
  phone_number?: string;
  logo_url?: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  subscription_tier: string;
  distance_km: number;
}

interface ShopSelectorProps {
  selectedShops: ShopWithDistance[];
  onShopsChange: (shops: ShopWithDistance[]) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function ShopSelector({ selectedShops, onShopsChange, userLocation }: ShopSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [nearbyShops, setNearbyShops] = useState<ShopWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: categoriesResponse } = useShopCategories();
  const categories = categoriesResponse?.data || [];

  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (userLocation) {
        resolve(userLocation);
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // Fallback to a default location (e.g., city center)
          console.warn('Geolocation error:', error);
          resolve({ lat: 28.6139, lng: 77.2090 }); // New Delhi fallback
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const fetchNearbyShops = async () => {
    setIsLoading(true);
    try {
      const location = await getUserLocation();
      const { data, error } = await shopService.getNearbyShops(location, 25); // 25km radius

      if (error) {
        console.error('Error fetching nearby shops:', error);
        return;
      }

      let filteredShops = data || [];

      // Filter by category if selected
      if (selectedCategory !== "all") {
        filteredShops = filteredShops.filter((shop: ShopWithDistance) => 
          shop.categories?.includes(selectedCategory)
        );
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredShops = filteredShops.filter((shop: ShopWithDistance) =>
          shop.name.toLowerCase().includes(query) ||
          shop.categories?.some(cat => cat.toLowerCase().includes(query))
        );
      }

      setNearbyShops(filteredShops);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyShops();
  }, [selectedCategory, searchQuery]);

  const isShopSelected = (shopId: string) => {
    return selectedShops.some(shop => shop.id === shopId);
  };

  const toggleShopSelection = (shop: ShopWithDistance) => {
    if (isShopSelected(shop.id)) {
      // Remove shop
      onShopsChange(selectedShops.filter(s => s.id !== shop.id));
    } else {
      // Add shop
      onShopsChange([...selectedShops, shop]);
    }
  };

  const removeSelectedShop = (shopId: string) => {
    onShopsChange(selectedShops.filter(s => s.id !== shopId));
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Shops Pills */}
        {selectedShops.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Selected Shops ({selectedShops.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {selectedShops.map((shop) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="pr-1 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <div className="flex items-center gap-2">
                        <span>{shop.name}</span>
                        {shop.distance_km < 999 && (
                          <span className="text-xs opacity-70">
                            {formatDistance(shop.distance_km)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                          onClick={() => removeSelectedShop(shop.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Available Shops */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">
          Available Shops {!isLoading && `(${nearbyShops.length})`}
        </h4>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                    <div className="w-20 h-8 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : nearbyShops.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No shops found matching your criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <AnimatePresence>
              {nearbyShops.map((shop, index) => {
                const selected = isShopSelected(shop.id);
                
                return (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleShopSelection(shop)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                          {/* Top row: Logo, Name, Add Button */}
                          <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
                            {/* Shop Logo */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {shop.logo_url ? (
                                <img 
                                  src={shop.logo_url} 
                                  alt={shop.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-base sm:text-lg font-bold text-muted-foreground">
                                  {shop.name.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Shop Name & Verified Badge */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                                  {shop.name}
                                </h3>
                                {shop.is_verified && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              {/* Rating & Distance - visible on desktop only in this row */}
                              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                {(shop.rating && shop.rating > 0) && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>{shop.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {shop.distance_km < 999 && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{formatDistance(shop.distance_km)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Selection Button - always on right */}
                            <Button
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className="flex-shrink-0 h-8 px-2 sm:px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleShopSelection(shop);
                              }}
                            >
                              {selected ? (
                                <>
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Add</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Bottom row on mobile: Rating, Distance, Categories */}
                          <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground sm:hidden">
                            {(shop.rating && shop.rating > 0) && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{shop.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {shop.distance_km < 999 && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{formatDistance(shop.distance_km)}</span>
                              </div>
                            )}
                            {shop.categories && shop.categories.length > 0 && (
                              <>
                                {shop.categories.slice(0, 2).map((category) => (
                                  <Badge key={category} variant="outline" className="text-[10px]">
                                    {category}
                                  </Badge>
                                ))}
                              </>
                            )}
                          </div>

                          {/* Categories - desktop only */}
                          {shop.categories && shop.categories.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-1">
                              {shop.categories.slice(0, 2).map((category) => (
                                <Badge key={category} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                              {shop.categories.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{shop.categories.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}