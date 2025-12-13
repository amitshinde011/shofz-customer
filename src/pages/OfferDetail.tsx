import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Tag,
  Clock,
  MapPin,
  Phone,
  Store,
  MessageSquare,
  CheckCircle2,
  Package,
  AlertCircle,
  ChevronRight,
  Home,
  Star,
  Share2,
  Info,
  Eye
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useViewTracking } from "@/hooks/useViewTracking";
import { useEntityViewCounts } from "@/hooks/useEntityViewCounts";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { getOfferDiscountText } from "@/lib/offerUtils";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Track offer view (automatically updates offer_stats via database trigger)
  useViewTracking('offer', id);

  // Fetch view counts
  const { data: viewCounts } = useEntityViewCounts('offer', id);

  // Fetch offer details
  const { data: offerResponse, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('offers')
        .select(`
          *,
          shops (
            id,
            name,
            address,
            logo_url,
            phone_number,
            rating,
            total_reviews,
            is_verified
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const offer = offerResponse;
  const shop = offer?.shops;

  // Track offer view in Google Analytics
  useEffect(() => {
    if (offer) {
      trackEvent('Offer', 'View', offer.title);
    }
  }, [offer]);

  // Get products from offer or fetch from shop
  const offerProducts = (offer as any)?.products || [];

  // Fetch additional products from shop for display
  const { data: productsData } = useProducts({
    shopId: offer?.shop_id,
    limit: 6,
  });
  const products = productsData?.data || [];

  const getDiscountText = () => {
    if (!offer) return "";
    return getOfferDiscountText(offer);
  };

  const getValidUntilText = () => {
    if (!offer.valid_until) return "Limited time offer";

    const date = new Date(offer.valid_until);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Correct type assignment for toLocaleDateString options
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit', // This is a valid literal string
      month: 'short'  // This is a valid literal string
    };

    if (diffDays < 1) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    if (diffDays <= 7) return `${diffDays} days left`;

    return `Valid ${new Date(offer.valid_from).toLocaleDateString('en-GB', options)} - ${date.toLocaleDateString('en-GB', options)}`;
  };

  const handleInquire = () => {
    let inquiryDescription = `I'm interested in the offer: ${offer?.title}. ${offer?.description || ''}`;

    // If offer has specific products, include them in the inquiry
    if (offerProducts.length > 0) {
      const productNames = offerProducts.map((p: any) => p.name).join(', ');
      inquiryDescription += `\n\nApplicable products: ${productNames}`;
    }

    // Use first applicable product name if available, otherwise use offer title
    const productName = offerProducts.length > 0
      ? offerProducts[0].name
      : offer?.title;

    navigate(`/inquiry/new?offer_id=${offer?.id}&shop_id=${offer?.shop_id}&product_name=${encodeURIComponent(productName || '')}&description=${encodeURIComponent(inquiryDescription)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="px-4 sm:px-6 pt-6 pb-20">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="px-4 sm:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Offer not found</h1>
            <p className="text-muted-foreground">This offer may have expired or been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: offer.title,
        text: `${getDiscountText()} - ${offer.description}`,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full">
      {/* Breadcrumbs */}
      <div className="bg-background border-b border-border px-3 sm:px-6 py-2">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button onClick={() => navigate('/')} className="hover:text-foreground flex items-center gap-1">
              <Home className="w-3 h-3" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate('/offers')} className="hover:text-foreground">
              Offers
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{offer.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Hero Image Section */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {(offer as any).image_url ? (
                  <div className="relative w-full aspect-square bg-white flex items-center justify-center">
                    <ResponsiveImage
                      src={(offer as any).image_url}
                      alt={offer.title}
                      size="square"
                      objectFit="contain"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-destructive text-white text-sm sm:text-xl font-bold px-4 sm:px-6 py-1 sm:py-2 shadow-lg">
                        {getDiscountText()}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-destructive/20 via-warning/10 to-primary/10 flex items-center justify-center">
                    <div className="text-center">
                      <Tag className="w-12 h-12 sm:w-16 sm:h-16 text-destructive mx-auto mb-3" />
                      <Badge className="bg-destructive text-white text-sm sm:text-xl font-bold px-4 sm:px-6 py-1 sm:py-2">
                        {getDiscountText()}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offer Title & Actions */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                    {offer.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>

                {offer.description && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                    {offer.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{getValidUntilText()}</span>
                  </div>
                  {viewCounts && viewCounts.view_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{viewCounts.view_count} views</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shop Info Card */}
            {shop && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 aspect-square rounded-full overflow-hidden border-2 border-border bg-white flex items-center justify-center">
                      <ResponsiveImage
                        src={shop.logo_url || '/placeholder.svg'}
                        alt={shop.name}
                        size="profile-sm"
                        objectFit="contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {shop.name}
                        </h3>
                        {shop.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-xs sm:text-sm">{shop.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          ({shop.total_reviews || 0} reviews)
                        </span>
                      </div>

                      {shop.address && (
                        <div className="flex items-start gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{shop.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-9 text-xs sm:text-sm"
                      onClick={() => navigate(`/shops/${shop.id}`)}
                    >
                      <Store className="w-3.5 h-3.5 mr-1.5" />
                      View Shop
                    </Button>
                    {shop.phone_number && (
                      <Button
                        variant="outline"
                        className="h-9 text-xs sm:text-sm"
                        onClick={() => window.location.href = `tel:${shop.phone_number}`}
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Call
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Conditions */}
            {(offer as any).terms_conditions && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Terms & Conditions
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {(offer as any).terms_conditions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Products Section */}
            {products.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">
                      Products from this shop
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs sm:text-sm h-8"
                      onClick={() => navigate(`/products?shop=${offer.shop_id}`)}
                    >
                      View All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4 space-y-4">
            {/* Offer Details Card */}
            <Card className="lg:sticky lg:top-4">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-semibold text-sm sm:text-base text-foreground mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Offer Details
                </h3>

                <div className="space-y-3 mb-4">
                  {offer.offer_type === "promotion" ? (
                    <>
                      <div className="flex justify-center items-center py-2">
                        <Badge className="bg-destructive text-white text-sm sm:text-base font-bold px-6 py-2">
                          {getDiscountText()}
                        </Badge>
                      </div>
                      <Separator />
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs sm:text-sm text-muted-foreground">Discount</span>
                        <Badge className="bg-destructive text-white text-xs sm:text-sm font-bold">
                          {getDiscountText()}
                        </Badge>
                      </div>
                      <Separator />
                    </>
                  )}

                  {(offer as any).minimum_order_amount && (
                    <>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs sm:text-sm text-muted-foreground">Minimum Order</span>
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          ₹{(offer as any).minimum_order_amount}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div className="flex justify-between items-start gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground">Valid Period</span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground text-right">
                      {getValidUntilText()}
                    </span>
                  </div>

                  {(offer as any).max_uses && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs sm:text-sm text-muted-foreground">Usage Limit</span>
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {(offer as any).current_uses || 0} / {(offer as any).max_uses}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm font-bold"
                  onClick={handleInquire}
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                  Inquire
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky CTA for Mobile 
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-20 shadow-lg">
        <Button
          className="w-full h-11 text-sm font-bold"
          onClick={handleInquire}
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Inquire
        </Button>
      </div>*/}
    </div>
  );
}