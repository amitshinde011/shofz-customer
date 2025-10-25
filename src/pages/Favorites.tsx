import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, ShoppingBag, Store, Package, ChevronRight } from "lucide-react";
import { useState } from "react";
import ShopCard from "@/components/ShopCard";
import ProductCard from "@/components/ProductCard";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserFavoriteShops, useToggleShopFavorite } from "@/hooks/useShops";
import { useUserFavoriteProducts, useToggleProductFavorite } from "@/hooks/useProducts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Favorites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: favoritesResponse } = useUserFavoriteShops();
  const toggleFavoriteMutation = useToggleShopFavorite();
  
  const { data: favoriteProductsResponse } = useUserFavoriteProducts();
  const toggleProductFavoriteMutation = useToggleProductFavorite();

  const favoriteShopData = favoritesResponse?.data?.map(fav => ({
    id: fav.shops.id,
    name: fav.shops.name,
    image: fav.shops.logo_url || '/placeholder.svg',
    category: fav.shops.categories?.[0] || 'General',
    subcategories: fav.shops.categories || [],
    rating: fav.shops.rating || 0,
    distance: '0.5 km', // Would calculate from user location
    address: fav.shops.address || '',
    isOpen: true, // Would check business hours
    delivery: false, // Would check shop capabilities
    deliveryTime: '30-45 min',
    establishedYear: 2020,
  })) || [];

  const favoriteProductData = favoriteProductsResponse?.data?.map(fav => ({
    id: fav.products.id,
    name: fav.products.name,
    price: fav.products.price,
    compare_at_price: fav.products.compare_at_price,
    images: fav.products.images,
    category: fav.products.category,
    stock_quantity: fav.products.stock_quantity,
    is_active: fav.products.is_active,
    inventory_tracking: fav.products.inventory_tracking,
    shops: fav.products.shops,
  })) || [];

  const totalFavorites = favoriteShopData.length + favoriteProductData.length;

  const toggleFavorite = (shopId: string) => {
    toggleFavoriteMutation.mutate({ shopId, isFavorited: true });
  };

  const toggleProductFavorite = (productId: string) => {
    toggleProductFavoriteMutation.mutate({ productId, isFavorited: true });
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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Breadcrumbs - Desktop only */}
      <div className="hidden lg:block bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-3">
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
                <BreadcrumbPage className="font-semibold">Favorites</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-3 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-inter">My Favorites</h1>
            <p className="text-sm text-muted-foreground">
              {totalFavorites} saved item{totalFavorites !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:block bg-card border-b border-border px-4 sm:px-6 py-4"
      >
        <div className="max-w-screen-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-inter">My Favorites</h1>
            <p className="text-sm text-muted-foreground">
              {totalFavorites} saved item{totalFavorites !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.header>

      <div className="max-w-screen-xl mx-auto page-container section-spacing">
        <Tabs defaultValue="shops" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="shops" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Shops ({favoriteShopData.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products ({favoriteProductData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shops">
            {favoriteShopData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteShopData.map((shop) => (
                  <ShopCard 
                    key={shop.id}
                    shop={shop} 
                    variant="grid"
                    onToggleFavorite={toggleFavorite}
                    isFavorite={true}
                    showActions={false}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Store className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">No favorite shops yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start exploring shops and tap the heart icon to save your favorites here.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/shops')}>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Browse Shops
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go to Home
                  </Button>
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {favoriteProductData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteProductData.map((product) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    variant="compact"
                    isFavorite={true}
                    onToggleFavorite={toggleProductFavorite}
                    showFavoriteButton={true}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">No favorite products yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Browse products and tap the heart icon to save your favorites here.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/products')}>
                    <Package className="w-4 h-4 mr-2" />
                    Browse Products
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go to Home
                  </Button>
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}