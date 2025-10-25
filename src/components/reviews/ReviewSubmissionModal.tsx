import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "./StarRating";
import { CategoryRating } from "./CategoryRating";
import { reviewService } from "@/services/reviewService";
import { useSubmitReview, useUpdateReview } from "@/hooks/useReviews";
import { Check, Loader2, X } from "lucide-react";

interface ReviewSubmissionModalProps {
  inquiry?: any; // Optional - for inquiry-based reviews
  shop: any;
  onClose: () => void;
  onSubmitted: () => void;
  existingReview?: any; // For editing
}

const getRatingText = (rating: number) => {
  const texts: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };
  return texts[rating] || '';
};

export function ReviewSubmissionModal({ inquiry, shop, onClose, onSubmitted, existingReview }: ReviewSubmissionModalProps) {
  const { user } = useAuth();
  const submitReview = useSubmitReview();
  const updateReview = useUpdateReview();
  const [currentStep, setCurrentStep] = useState(1);
  const [review, setReview] = useState({
    rating: existingReview?.rating || 0,
    title: existingReview?.title || '',
    review_text: existingReview?.review_text || existingReview?.comment || '',
    product_quality_rating: existingReview?.product_quality_rating || 0,
    service_rating: existingReview?.service_rating || 0,
    price_rating: existingReview?.price_rating || 0,
    delivery_rating: existingReview?.delivery_rating || 0,
    review_images: existingReview?.review_images || [] as string[],
    is_anonymous: existingReview?.is_anonymous || false,
    is_verified_purchase: existingReview?.is_verified_purchase || false
  });
  const [reviewImages, setReviewImages] = useState<string[]>(existingReview?.review_images || []);
  const [templates, setTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadReviewTemplates();
  }, []);

  const loadReviewTemplates = async () => {
    const { data } = await reviewService.getReviewTemplates();
    if (data) setTemplates(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedUrls = await reviewService.uploadReviewImages(files);
      
      setReviewImages([...reviewImages, ...uploadedUrls]);
      setReview(prev => ({ 
        ...prev, 
        review_images: [...prev.review_images, ...uploadedUrls] 
      }));
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    const reviewData = {
      shop_id: shop.id,
      customer_id: user.id,
      inquiry_id: inquiry?.id || null,
      rating: review.rating,
      title: review.title,
      review_text: review.review_text,
      product_quality_rating: review.product_quality_rating || null,
      service_rating: review.service_rating || null,
      price_rating: review.price_rating || null,
      delivery_rating: review.delivery_rating || null,
      review_images: review.review_images,
      is_anonymous: review.is_anonymous,
      is_verified_purchase: !!inquiry?.id
    };

    if (existingReview) {
      await updateReview.mutateAsync({ reviewId: existingReview.id, reviewData });
    } else {
      await submitReview.mutateAsync(reviewData);
    }
    
    onSubmitted();
    onClose();
  };

  const useTemplate = (template: any) => {
    setReview(prev => ({
      ...prev,
      rating: template.rating,
      review_text: template.template_text
    }));
    // Advance to next step after selecting template
    setCurrentStep(2);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingReview ? 'Edit' : 'Review'} {shop.name}</DialogTitle>
          <DialogDescription>
            {inquiry ? `Share your experience for: ${inquiry.product_name}` : 'Share your experience with this shop'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Progress */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                  step === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
            ))}
          </div>

          {/* Step 1: Overall Rating */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Overall Experience</h3>
              
              <div className="text-center">
                <p className="mb-4">How would you rate your overall experience?</p>
                <StarRating
                  rating={review.rating}
                  onRatingChange={(rating) => setReview(prev => ({ ...prev, rating }))}
                  size="large"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {review.rating > 0 && getRatingText(review.rating)}
                </p>
              </div>

              {/* Quick Templates */}
              {templates.length > 0 && review.rating > 0 && (
                <div>
                  <Label className="mb-2 block">Quick Review Templates:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {templates.filter(t => t.rating === review.rating).map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => useTemplate(template)}
                        className="text-left h-auto p-2 justify-start"
                      >
                        {template.template_text}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Detailed Ratings */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detailed Ratings (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CategoryRating
                  label="Product Quality"
                  rating={review.product_quality_rating}
                  onRatingChange={(rating) => 
                    setReview(prev => ({ ...prev, product_quality_rating: rating }))
                  }
                />
                <CategoryRating
                  label="Service"
                  rating={review.service_rating}
                  onRatingChange={(rating) => 
                    setReview(prev => ({ ...prev, service_rating: rating }))
                  }
                />
                <CategoryRating
                  label="Value for Money"
                  rating={review.price_rating}
                  onRatingChange={(rating) => 
                    setReview(prev => ({ ...prev, price_rating: rating }))
                  }
                />
                <CategoryRating
                  label="Delivery/Pickup"
                  rating={review.delivery_rating}
                  onRatingChange={(rating) => 
                    setReview(prev => ({ ...prev, delivery_rating: rating }))
                  }
                />
              </div>
            </div>
          )}

          {/* Step 3: Written Review and Photos */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Share Details</h3>
              
              <div>
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your experience"
                  value={review.title}
                  onChange={(e) => setReview(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="review_text">Your Review</Label>
                <Textarea
                  id="review_text"
                  placeholder="Tell others about your experience..."
                  value={review.review_text}
                  onChange={(e) => setReview(prev => ({ ...prev, review_text: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {review.review_text.length}/1000 characters
                </p>
              </div>

              {/* Image Upload */}
              <div>
                <Label>Add Photos (Optional)</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="mb-2"
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                  {reviewImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {reviewImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Review ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground p-0"
                            onClick={() => {
                              const newImages = reviewImages.filter((_, i) => i !== index);
                              setReviewImages(newImages);
                              setReview(prev => ({ ...prev, review_images: newImages }));
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={review.is_anonymous}
                    onCheckedChange={(checked) => 
                      setReview(prev => ({ ...prev, is_anonymous: checked as boolean }))
                    }
                  />
                  <span className="text-sm">Submit as anonymous review</span>
                </label>

                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={review.is_verified_purchase}
                    onCheckedChange={(checked) => 
                      setReview(prev => ({ ...prev, is_verified_purchase: checked as boolean }))
                    }
                  />
                  <span className="text-sm">This is a verified purchase</span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>

            {currentStep < 3 ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 1 && review.rating === 0}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={submitReview.isPending || updateReview.isPending || review.rating === 0}
              >
                {(submitReview.isPending || updateReview.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {existingReview ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  existingReview ? 'Update Review' : 'Submit Review'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}