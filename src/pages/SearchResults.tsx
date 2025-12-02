import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Store, Tag, Search, X } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import ShopCard from '@/components/ShopCard';
import OfferCard from '@/components/OfferCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedSearch, useRecentSearches } from '@/hooks/useSearch';
import { useToggleProductFavorite, useUserFavoriteProducts } from '@/hooks/useProducts';
import { useToggleShopFavorite, useUserFavoriteShops } from '@/hooks/useShops';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'shops' | 'offers'>('all');
  const { addSearch } = useRecentSearches();

  // Update search query when URL changes
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    setSearchQuery(urlQuery);
  }, [searchParams]);

  // Fetch unified search results
  const { data: searchResults, isLoading, refetch } = useUnifiedSearch(query);

  // Pull to refresh
  const handleRefresh = async () => {
    await refetch();
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  // Favorites
  const { data: favoriteProductsResponse } = useUserFavoriteProducts();
  const { data: favoriteShopsResponse } = useUserFavoriteShops();
  const toggleProductFavoriteMutation = useToggleProductFavorite();
  const toggleShopFavoriteMutation = useToggleShopFavorite();

  const favoriteProductIds = new Set(
    favoriteProductsResponse?.data?.map(fav => fav.product_id) || []
  );
  const favoriteShopIds = favoriteShopsResponse?.data?.map(fav => fav.shop_id) || [];

  // Track search when query changes
  useEffect(() => {
    if (query) {
      addSearch(query);
    }
  }, [query]);

  const handleSearch = (newQuery: string) => {
    if (newQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(newQuery.trim())}`);
    }
  };

  const handleInquire = (product: any) => {
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

  const products = searchResults?.products || [];
  const shops = searchResults?.shops || [];
  const offers = searchResults?.offers || [];

  const totalResults = products.length + shops.length + offers.length;

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

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Search Results</h1>
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search products, shops, offers..."
          />

          {/* Query Display */}
          {query && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                <Search className="w-3.5 h-3.5" />
                <span className="font-medium">{query}</span>
                <X
                  className="w-3.5 h-3.5 cursor-pointer hover:text-destructive"
                  onClick={() => navigate('/search')}
                />
              </Badge>
              <span className="text-sm text-muted-foreground">
                {isLoading ? 'Searching...' : `${totalResults} results`}
              </span>
            </div>
          )}
        </div>
      </motion.header>

      {/* Results Tabs */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              All
              {totalResults > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalResults}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <Package className="w-4 h-4 mr-2" />
              Products
              {products.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {products.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="shops"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <Store className="w-4 h-4 mr-2" />
              Shops
              {shops.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {shops.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="offers"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <Tag className="w-4 h-4 mr-2" />
              Offers
              {offers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {offers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="mt-6 space-y-8">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : totalResults === 0 ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search terms or browse our categories
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" asChild>
                    <Link to="/products">Browse Products</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/shops">Browse Shops</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Products Section */}
                {products.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Products ({products.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {products.slice(0, 8).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isFavorite={favoriteProductIds.has(product.id)}
                          onInquire={() => handleInquire(product)}
                          onToggleFavorite={() => {
                            toggleProductFavoriteMutation.mutate({
                              productId: product.id,
                              isFavorited: favoriteProductIds.has(product.id),
                            });
                          }}
                        />
                      ))}
                    </div>
                    {products.length > 8 && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setActiveTab('products')}
                      >
                        View All {products.length} Products
                      </Button>
                    )}
                  </div>
                )}

                {/* Shops Section */}
                {shops.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Shops ({shops.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shops.slice(0, 6).map((shop) => (
                        <ShopCard
                          key={shop.id}
                          shop={shop}
                          variant="list"
                          isFavorite={favoriteShopIds.includes(shop.id)}
                          onToggleFavorite={() => {
                            toggleShopFavoriteMutation.mutate({
                              shopId: shop.id,
                              isFavorited: favoriteShopIds.includes(shop.id),
                            });
                          }}
                        />
                      ))}
                    </div>
                    {shops.length > 6 && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setActiveTab('shops')}
                      >
                        View All {shops.length} Shops
                      </Button>
                    )}
                  </div>
                )}

                {/* Offers Section */}
                {offers.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Offers ({offers.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {offers.slice(0, 6).map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                        />
                      ))}
                    </div>
                    {offers.length > 6 && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setActiveTab('offers')}
                      >
                        View All {offers.length} Offers
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={favoriteProductIds.has(product.id)}
                    onInquire={() => handleInquire(product)}
                    onToggleFavorite={() => {
                      toggleProductFavoriteMutation.mutate({
                        productId: product.id,
                        isFavorited: favoriteProductIds.has(product.id),
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shops Tab */}
          <TabsContent value="shops" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="text-center py-16">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No shops found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    variant="list"
                    isFavorite={favoriteShopIds.includes(shop.id)}
                    onToggleFavorite={() => {
                      toggleShopFavoriteMutation.mutate({
                        shopId: shop.id,
                        isFavorited: favoriteShopIds.includes(shop.id),
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-16">
                <Tag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No offers found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
