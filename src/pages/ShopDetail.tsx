import { motion } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Navigation,
  Heart,
  
  ChevronDown,
  ChevronRight,
  Package,
  CreditCard,
  Truck,
  Eye,
  Share2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";
import { useViewTracking } from "@/hooks/useViewTracking";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import { useShop, useToggleShopFavorite, useUserFavoriteShops } from "@/hooks/useShops";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ShopReviewsList } from "@/components/reviews/ShopReviewsList";
import { ShopReviewButton } from "@/components/reviews/ShopReviewButton";
import { DeliveryDetailsCard } from "@/components/shop/DeliveryDetailsCard";
import { DeliveryCoverageChecker } from "@/components/shop/DeliveryCoverageChecker";
import { useProducts } from "@/hooks/useProducts";
import { useOffers } from "@/hooks/useOffers";
import OfferCard from "@/components/OfferCard";
import { useUserLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { calculateShopStatus, getTodayHours } from "@/lib/businessHours";
import { getFormattedDistance, estimateTravelTime, calculateDistance } from "@/lib/distanceCalculation";
import ImageGallery from "@/components/ImageGallery";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast as sonnerToast } from 'sonner';

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAllHours, setShowAllHours] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { location } = useUserLocation();
  const { user } = useAuth();
  const { trackShopView } = useAnalytics();

  // Track shop view (automatically updates shop_stats via database trigger)
  useViewTracking('shop', id);

  // Fetch view counts
  const { data: viewCounts } = useEntityViewCounts('shop', id);

  // Fetch shop data
  const { data: shopData, isLoading, error } = useShop(id!);
  const shop = shopData?.data;

  // Track shop view in analytics (Google Analytics + Database)
  useEffect(() => {
    if (shop) {
      trackShopView(shop.id, shop.name, 'shop_detail');
    }
  }, [shop]);

  // Fetch shop products
  const { data: productsData } = useProducts({
    shopId: id,
    limit: 12,
  });
  const shopProducts = productsData?.data || [];

  // Fetch shop offers
  const { data: offersData } = useOffers({
    shopId: id,
    limit: 6,
  });
  const shopOffers = offersData?.data || [];

  // Sort products and offers: featured first, then by creation date
  const sortedShopProducts = useMemo(() => {
    return [...shopProducts].sort((a, b) => {
      // Featured items first
      if (a.is_featured !== b.is_featured) {
        return a.is_featured ? -1 : 1;
      }
      // Then by newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [shopProducts]);

  const sortedShopOffers = useMemo(() => {
    return [...shopOffers].sort((a, b) => {
      // Featured items first
      if (a.is_featured !== b.is_featured) {
        return a.is_featured ? -1 : 1;
      }
      // Then by newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [shopOffers]);

  // Fetch favorites
  const { data: favoritesResponse } = useUserFavoriteShops();
  const favoriteShopIds = favoritesResponse?.data?.map(fav => fav.shop_id) || [];
  const isFavorite = shop ? favoriteShopIds.includes(shop.id) : false;

  // Toggle favorite mutation
  const toggleFavoriteMutation = useToggleShopFavorite();

  // Calculate shop status
  const shopStatus = useMemo(() => {
    if (!shop) return null;
    return calculateShopStatus(shop.business_hours as any);
  }, [shop]);

  // Calculate distance
  const distance = useMemo(() => {
    if (!shop?.location || !location) return null;
    return getFormattedDistance(location, { lat: shop.location.lat, lng: shop.location.lng });
  }, [shop, location]);

  const travelTime = useMemo(() => {
    if (!shop?.location || !location) return null;
    const distKm = calculateDistance(location, { lat: shop.location.lat, lng: shop.location.lng });
    return estimateTravelTime(distKm);
  }, [shop, location]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shop?.name,
          text: shop?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      sonnerToast.success('Link copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
        <Skeleton className="h-48 sm:h-64 w-full" />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-12 pb-20">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background pt-16 overflow-x-hidden w-full max-w-full">
        <div className="px-4 sm:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">Shop not found</h1>
            <p className="text-muted-foreground">The shop you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const galleryImages = [
    shop.cover_image_url || shop.logo_url || '/placeholder.svg',
    ...(shop.gallery_images || []),
  ].filter(Boolean);

  const toggleFavorite = () => {
    toggleFavoriteMutation.mutate({ shopId: shop.id, isFavorited: isFavorite });
  };

  const handleCall = () => {
    if (shop.phone_number) {
      window.location.href = `tel:${shop.phone_number}`;
    }
  };

  const handleEmail = () => {
    if (shop.email) {
      window.location.href = `mailto:${shop.email}`;
    }
  };

  const handleChat = () => {
    navigate(`/inquiry/new?shopId=${shop.id}`);
  };

  const handleGetDirections = () => {
    if (shop.location?.lat && shop.location?.lng) {
      const destination = `${shop.location.lat},${shop.location.lng}`;
      const origin = location ? `${location.lat},${location.lng}` : '';
      const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination}&travelmode=driving`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "Location unavailable",
        description: "Shop location coordinates are not available.",
        variant: "destructive",
      });
    }
  };

  const todayHoursDisplay = getTodayHours(shop.business_hours as any);
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayDisplayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const businessHours = shop.business_hours as any;
  
  // Get unique categories to avoid duplicates
  const uniqueCategories = shop.categories ? [...new Set(shop.categories)] as string[] : [];
  
  // Categories display logic
  const visibleCategories = showAllCategories 
    ? uniqueCategories 
    : uniqueCategories.slice(0, 3);
  const hasMoreCategories = uniqueCategories.length > 3;
  const hiddenCategoriesCount = uniqueCategories.length - 3;

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full">
      {/* Breadcrumbs - Desktop only */}
      <div className="hidden lg:block bg-background border-b border-border px-4 sm:px-6 py-2">
        <div className="max-w-screen-xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-3 h-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/shops">Shops</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-3 h-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="font-semibold line-clamp-1">{shop.name}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Mobile Back Button - Floating */}
      <div className="lg:hidden fixed top-4 left-4 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 shadow-lg bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Hero Banner Section - Amazon Style */}
      <div className="relative bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left - Shop Logo & Info */}
            <div className="lg:col-span-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Shop Logo */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 aspect-square rounded-xl border-4 border-background bg-white overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center">
                  <ResponsiveImage
                    src={shop.logo_url || '/placeholder.svg'}
                    alt={`${shop.name} logo`}
                    size="square"
                    objectFit="contain"
                  />
                </div>

                {/* Shop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{shop.name}</h1>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleShare}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 ${
                          isFavorite ? 'text-destructive' : ''
                        }`}
                        onClick={toggleFavorite}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {visibleCategories.map((category, index) => (
                      <Badge key={`${category}-${index}`} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    
                    {/* Show More/Less Button */}
                    {hasMoreCategories && (
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => setShowAllCategories(!showAllCategories)}
                      >
                        {showAllCategories 
                          ? 'Show less' 
                          : `+${hiddenCategoriesCount} more`
                        }
                      </Badge>
                    )}
                    
                    {/* Status Badge */}
                    <Badge
                      variant={shopStatus?.isOpen ? "default" : "secondary"}
                      className={`text-xs ${
                        shopStatus?.isOpen
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {shopStatus?.isOpen ? "Open Now" : "Closed"}
                    </Badge>
                  </div>

                  {/* Rating & Stats */}
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    {(shop.rating && shop.rating > 0) && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-warning text-warning" />
                        <span className="font-bold text-foreground">{shop.rating.toFixed(1)}</span>
                        {(shop.total_reviews && shop.total_reviews > 0) && (
                          <span className="text-sm text-muted-foreground">
                            ({shop.total_reviews} {shop.total_reviews === 1 ? 'review' : 'reviews'})
                          </span>
                        )}
                      </div>
                    )}
                    {viewCounts && viewCounts.view_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{viewCounts.view_count} views</span>
                      </div>
                    )}
                    {sortedShopProducts.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{sortedShopProducts.length} products</span>
                      </div>
                    )}
                  </div>

                  {/* Location & Hours */}
                  <div className="space-y-1.5">
                    {distance && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {distance} away {travelTime && `• ${travelTime}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className={shopStatus?.isOpen ? "text-success font-medium" : "text-muted-foreground"}>
                        {shopStatus?.nextStatusChange}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Button onClick={handleCall} className="h-10" size="sm">
                  <Phone className="w-4 h-4 mr-1.5" />
                  Call
                </Button>
                <Button onClick={handleChat} variant="outline" className="h-10" size="sm">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Inquire
                </Button>
                <Button onClick={handleGetDirections} variant="outline" className="h-10" size="sm">
                  <Navigation className="w-4 h-4 mr-1.5" />
                  Direct
                </Button>
              </div>
            </div>

            {/* Right - Image Gallery (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="rounded-lg overflow-hidden">
                <ImageGallery images={galleryImages.slice(0, 4)} shopName={shop.name} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area - Products */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mobile Gallery */}
            <div className="lg:hidden">
              <ImageGallery images={galleryImages} shopName={shop.name} />
            </div>

            {/* Offers Section */}
            {sortedShopOffers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Current Offers</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/offers?shop=${shop.id}`)}
                      className="text-xs"
                    >
                      View All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedShopOffers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        variant="compact"
                        hideButton
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Information Section */}
            {shop.delivery_available && shop.location && (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Delivery Information</h2>
                  </div>
                  
                  {/* Delivery Details Card */}
                  <DeliveryDetailsCard 
                    shop={shop} 
                    customerLocation={location} 
                  />
                  
                  {/* Interactive Coverage Checker */}
                  <DeliveryCoverageChecker
                    shop={shop}
                    customerLocation={location}
                  />
                </CardContent>
              </Card>
            )}

            {/* Offers from this shop - Grid Layout */}
            {sortedShopOffers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Offers from this shop</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/offers?shop=${shop.id}`)}
                      className="text-xs"
                    >
                      View All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sortedShopOffers.slice(0, 6).map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        variant="default"
                        hideButton={false}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products Grid */}
            {sortedShopProducts.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Products from this shop</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/products?shop=${shop.id}`)}
                      className="text-xs"
                    >
                      View All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sortedShopProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shop Reviews */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold">Customer Reviews</h2>
                <ShopReviewButton shop={shop} />
              </div>
              <ShopReviewsList shopId={shop.id} />
            </div>
          </div>

          {/* Sidebar - Shop Info */}
          <div className="lg:col-span-4 space-y-4">
            {/* About Section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {shop.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">Business Hours</h3>

                <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Today</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{todayHoursDisplay}</span>
                </div>

                {businessHours && (
                  <Collapsible open={showAllHours} onOpenChange={setShowAllHours}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <span className="text-xs text-muted-foreground">View all hours</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAllHours ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="space-y-2">
                        {dayNames.map((day, index) => (
                          <div key={day} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{dayDisplayNames[index]}</span>
                            <span className="font-medium">
                              {businessHours[day]?.isOpen
                                ? `${businessHours[day].open} - ${businessHours[day].close}`
                                : 'Closed'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">Contact</h3>

                <div className="space-y-3">
                  {shop.phone_number && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                        <p className="text-sm text-foreground font-medium">{shop.phone_number}</p>
                      </div>
                    </div>
                  )}

                  {shop.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                        <p className="text-sm text-foreground font-medium break-all">{shop.email}</p>
                      </div>
                    </div>
                  )}

                  {shop.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                        <p className="text-sm text-foreground font-medium">{shop.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
