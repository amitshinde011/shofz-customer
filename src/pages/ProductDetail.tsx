import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Share2, ChevronRight, CheckCircle2, Zap, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useViewTracking } from '@/hooks/useViewTracking';
import { useEntityViewCounts } from '@/hooks/useEntityViewCounts';
import { ProductGallery } from '@/components/product-detail/ProductGallery';
import { PriceBlock } from '@/components/product-detail/PriceBlock';
import { StockBadge } from '@/components/product-detail/StockBadge';
import { SellerCard } from '@/components/product-detail/SellerCard';
import { DescriptionSection } from '@/components/product-detail/DescriptionSection';
import { SpecificationsTable } from '@/components/product-detail/SpecificationsTable';
import { ReviewsPreview } from '@/components/product-detail/ReviewsPreview';
import { RelatedProductsRail } from '@/components/product-detail/RelatedProductsRail';
import { InlineActionButtons } from '@/components/product-detail/InlineActionButtons';
import { ProductDetailSkeleton } from '@/components/product-detail/ProductDetailSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackProductView } = useAnalytics();

  // Track product view (automatically updates product_stats via database trigger)
  useViewTracking('product', id);

  // Fetch view counts
  const { data: viewCounts } = useEntityViewCounts('product', id);

  const { data: productData, isLoading, error } = useProduct(id || '');
  const product = productData?.data;

  const { data: relatedData } = useRelatedProducts(
    id || '',
    product?.category || '',
    6
  );
  const relatedProducts = relatedData?.data || [];

  useEffect(() => {
    if (product) {
      trackProductView(product.id, product.name, 'product_detail');
    }
  }, [product]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold mb-2 text-foreground">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/products')}>
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full">
      {/* Breadcrumbs - Amazon Style */}
      <div className="bg-background border-b border-border px-4 sm:px-6 py-2">
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
                  <Link to="/products">Products</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {product.category && (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-3 h-3" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/products?category=${product.category}`}>{product.category}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content - Amazon Two-Column Layout */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Gallery (Mobile: Full Width, Desktop: 5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-4">
              <ProductGallery images={product.images} productName={product.name} />
            </div>
          </div>

          {/* Right Column - Product Info (Mobile: Full Width, Desktop: 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Product Title & Category */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2 text-foreground leading-tight">
                {product.name}
              </h1>
              <div className="flex flex-wrap gap-2 items-center">
                {product.category && (
                  <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                )}
                {product.subcategory && (
                  <Badge variant="outline" className="text-xs">{product.subcategory}</Badge>
                )}
                {viewCounts && viewCounts.view_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-medium">{viewCounts.view_count} views</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Price & Stock - Amazon Style */}
            <div className="space-y-3">
              <PriceBlock
                price={product.price}
                compareAtPrice={product.compare_at_price}
              />
              <StockBadge
                isActive={product.is_active}
                inventoryTracking={product.inventory_tracking}
                quantity={product.stock_quantity}
              />
            </div>

            {/* Action Buttons */}
            <InlineActionButtons product={product} />

            <Separator />

            {/* LocalConnect Features Section */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-full flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">✅ Verified Shops</p>
                    <p className="text-xs text-muted-foreground">Trusted local vendors</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-warning/10 rounded-full flex-shrink-0">
                    <Zap className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">⚡ Instant Connect</p>
                    <p className="text-xs text-muted-foreground">Direct shop contact</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-success/10 rounded-full flex-shrink-0">
                    <Star className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">⭐ Real Reviews</p>
                    <p className="text-xs text-muted-foreground">Community feedback</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seller Card */}
            {product.shops && (
              <SellerCard
                shop={product.shops}
                productId={product.id}
              />
            )}
          </div>
        </div>

        {/* Full Width Sections Below */}
        <div className="mt-8 space-y-6">
          {/* Tabbed Content - Amazon Style */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="description" className="text-xs sm:text-sm">Description</TabsTrigger>
                  <TabsTrigger value="specifications" className="text-xs sm:text-sm">Specifications</TabsTrigger>
                  <TabsTrigger value="tags" className="text-xs sm:text-sm">Details</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="space-y-4">
                  {product.description ? (
                    <DescriptionSection description={product.description} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No description available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="specifications" className="space-y-4">
                  {product.specifications ? (
                    <SpecificationsTable specifications={product.specifications} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No specifications available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="tags" className="space-y-4">
                  {product.tags && product.tags.length > 0 ? (
                    <>
                      <h3 className="text-sm font-semibold mb-3 text-foreground">Product Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tags available
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Reviews Preview 
          <Card>
            <CardContent className="p-0">
              <ReviewsPreview productId={product.id} shopId={product.shop_id} />
            </CardContent>
          </Card>*/}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <RelatedProductsRail products={relatedProducts} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;
