import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Plus, Minus, Send, Store, ChevronRight, Truck, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useCreateInquiry } from "@/hooks/useInquiries";
import { useShop } from "@/hooks/useShops";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLocation } from "@/contexts/LocationContext";
import { checkDeliveryAvailability, DeliveryAvailability } from "@/lib/deliveryCalculations";
import { z } from "zod";
import ShopSelector from "@/components/ShopSelector";
import { AttachmentUpload } from "@/components/AttachmentUpload";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const inquirySchema = z.object({
  product_name: z.string().min(1, "Product name is required").max(100, "Product name too long"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  quantity: z.number().min(1, "Quantity must be at least 1").max(100, "Quantity too high"),
  budget_min: z.number().min(0, "Budget must be positive").optional(),
  budget_max: z.number().min(0, "Budget must be positive").optional(),
  preferred_contact: z.enum(["chat", "call", "both"]),
  order_type: z.enum(["pickup", "delivery"]).optional(),
  delivery_address: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

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

export default function InquiryForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { location } = useUserLocation();
  
  const shopId = searchParams.get("shopId") || searchParams.get("shop_id");
  const offerId = searchParams.get("offer_id");
  const productName = searchParams.get("product_name") || "";
  const prefilledDescription = searchParams.get("description") || "";
  const { data: shopResponse } = useShop(shopId || "");
  const shop = shopResponse?.data;
  const createInquiry = useCreateInquiry();

  const [formData, setFormData] = useState<InquiryFormData>({
    product_name: productName,
    description: prefilledDescription,
    quantity: 1,
    budget_min: 0,
    budget_max: 5000,
    preferred_contact: "chat",
    order_type: "pickup",
    delivery_address: "",
  });

  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 5000]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedShops, setSelectedShops] = useState<ShopWithDistance[]>([]);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [deliveryAvailability, setDeliveryAvailability] = useState<DeliveryAvailability | null>(null);

  // Update form data when URL parameters change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      product_name: productName,
      description: prefilledDescription,
    }));
  }, [productName, prefilledDescription]);

  // Preload shop if provided via URL
  useEffect(() => {
    if (shop && !selectedShops.find(s => s.id === shop.id)) {
      const shopWithDistance: ShopWithDistance = {
        ...shop,
        distance_km: 0, // Will be calculated by ShopSelector if location is available
      };
      setSelectedShops([shopWithDistance]);
    }
  }, [shop]);

  // Check delivery availability when order type or location changes
  useEffect(() => {
    if (
      formData.order_type === "delivery" &&
      shop?.delivery_available &&
      shop?.location &&
      location
    ) {
      const availability = checkDeliveryAvailability(
        { lat: shop.location.lat, lng: shop.location.lng },
        location,
        shop.delivery_coverage_km || 5,
        shop.delivery_charge_per_km,
        shop.free_delivery_above,
        formData.budget_max
      );
      setDeliveryAvailability(availability);
    } else {
      setDeliveryAvailability(null);
    }
  }, [formData.order_type, shop, location, formData.budget_max]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(100, formData.quantity + delta));
    setFormData(prev => ({ ...prev, quantity: newQuantity }));
  };

  const handleBudgetChange = (values: number[]) => {
    setBudgetRange(values as [number, number]);
    setFormData(prev => ({ 
      ...prev, 
      budget_min: values[0], 
      budget_max: values[1] 
    }));
  };

  const validateForm = (): boolean => {
    try {
      inquirySchema.parse(formData);
      
      // Additional validation for selected shops
      if (selectedShops.length === 0) {
        setErrors({ shops: "Please select at least one shop for your inquiry" });
        return false;
      }
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Note: Address validation removed as it's not available on AuthUser type
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the form for validation errors and try again.",
        variant: "destructive"
      });
      return;
    }

    if (selectedShops.length === 0) {
      toast({
        title: "No shops selected",
        description: "Please select at least one shop for your inquiry.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create inquiries for all selected shops
      const inquiryPromises = selectedShops.map(shop => {
        const inquiryData = {
          shop_id: shop.id,
          product_name: formData.product_name,
          description: formData.description,
          quantity: formData.quantity,
          budget_min: formData.budget_min,
          budget_max: formData.budget_max,
          preferred_contact: formData.preferred_contact,
          image_url: attachmentPath ? `customer-uploads/${attachmentPath}` : undefined,
          attachment_urls: attachmentPath ? [attachmentPath] : [],
          order_type: formData.order_type || 'pickup',
          delivery_address: formData.order_type === 'delivery' ? formData.delivery_address : undefined,
          delivery_location: formData.order_type === 'delivery' && location ? {
            lat: location.lat,
            lng: location.lng
          } : undefined,
        };
        return createInquiry.mutateAsync(inquiryData);
      });

      await Promise.all(inquiryPromises);

      const searchParams = new URLSearchParams({
        shop_count: selectedShops.length.toString(),
        product_name: formData.product_name
      });
      
      navigate(`/inquiry/success?${searchParams.toString()}`);
    } catch (error) {
      console.error('Error submitting inquiries:', error);
      // Error is handled by the mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto page-container section-spacing">
      {/* Breadcrumbs - Desktop only */}
      <div className="hidden lg:block bg-background border-b border-border px-4 sm:px-6 py-3 mb-4">
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
              <span className="font-semibold">New Inquiry</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card border-b border-border px-4 sm:px-6 py-4"
      >
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-inter">New Inquiry</h1>
            {selectedShops.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedShops.length === 1 
                  ? `to ${selectedShops[0].name}` 
                  : `to ${selectedShops.length} shops`
                }
              </p>
            )}
          </div>
        </div>
      </motion.header>

      <div className="px-4 sm:px-6 py-6">
        {/* Shop Selection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Select Shops
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ShopSelector
                selectedShops={selectedShops}
                onShopsChange={setSelectedShops}
                userLocation={location}
              />
              {errors.shops && (
                <p className="text-sm text-destructive mt-2">{errors.shops}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Inquiry Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Product Inquiry Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="What are you looking for?"
                    className={errors.product_name ? "border-destructive" : ""}
                  />
                  {errors.product_name && (
                    <p className="text-sm text-destructive">{errors.product_name}</p>
                  )}
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex items-center space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={formData.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="w-16 text-center">
                      <span className="text-lg font-semibold">{formData.quantity}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(1)}
                      disabled={formData.quantity >= 100}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Additional Details (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Any specific requirements, preferred brands, colors, etc."
                    maxLength={500}
                    className={`min-h-[100px] ${errors.description ? "border-destructive" : ""}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{errors.description || ""}</span>
                    <span>{formData.description?.length || 0}/500</span>
                  </div>
                </div>

                {/* Budget Range */}
                <div className="space-y-4">
                  <Label>Budget Range (Optional)</Label>
                  <div className="px-4">
                    <Slider
                      value={budgetRange}
                      onValueChange={handleBudgetChange}
                      min={0}
                      max={100000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>₹{budgetRange[0].toLocaleString()}</span>
                      <span>₹{budgetRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Product Image Upload */}
                <div className="space-y-2">
                  <Label>Product Image (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload photos to help shops understand what you're looking for
                  </p>
                  <AttachmentUpload
                    inquiryId='temp'
                    onAttachmentUploaded={(path) => setAttachmentPath(path)}
                    onAttachmentRemoved={() => setAttachmentPath(null)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Order Type Selection */}
                {shop?.delivery_available && (
                  <div className="space-y-3">
                    <Label>Order Type</Label>
                    <RadioGroup
                      value={formData.order_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, order_type: value as any }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="cursor-pointer">Pickup from shop</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="delivery" id="delivery" />
                        <Label htmlFor="delivery" className="cursor-pointer flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Delivery Details */}
                {formData.order_type === "delivery" && shop?.delivery_available && (
                  <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Delivery Information</h4>
                    </div>

                    {/* Delivery Availability Alert */}
                    {deliveryAvailability && (
                      <Alert variant={deliveryAvailability.isAvailable ? "default" : "destructive"}>
                        {deliveryAvailability.isAvailable ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <AlertTitle className="text-sm">
                          {deliveryAvailability.isAvailable 
                            ? "✅ This shop delivers to your location"
                            : "⚠️ Outside delivery coverage area"
                          }
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          {deliveryAvailability.message}
                          {deliveryAvailability.isAvailable && deliveryAvailability.deliveryCharge !== undefined && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <span className="font-medium">Estimated delivery charge: </span>
                              {deliveryAvailability.isFreeDelivery ? (
                                <span className="text-success font-bold">FREE</span>
                              ) : (
                                <span className="text-primary font-bold">₹{deliveryAvailability.deliveryCharge}</span>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {!location && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm">Location required</AlertTitle>
                        <AlertDescription className="text-xs">
                          Please enable location access or enter your delivery address to check availability.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Delivery Address Input */}
                    <div className="space-y-2">
                      <Label htmlFor="delivery_address">Delivery Address (Optional)</Label>
                      <Textarea
                        id="delivery_address"
                        value={formData.delivery_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                        placeholder="Enter your complete delivery address"
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Add your complete delivery address including landmarks for accurate delivery.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Preference */}
                <div className="space-y-3">
                  <Label>Preferred Contact Method</Label>
                  <RadioGroup
                    value={formData.preferred_contact}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_contact: value as any }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chat" id="chat" />
                      <Label htmlFor="chat" className="cursor-pointer">Chat (Recommended)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="call" id="call" />
                      <Label htmlFor="call" className="cursor-pointer">Phone Call</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both" className="cursor-pointer">Both Chat & Call</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full h-12"
                    disabled={isSubmitting || selectedShops.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending Inquir{selectedShops.length > 1 ? 'ies' : 'y'}...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send to {selectedShops.length} Shop{selectedShops.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}