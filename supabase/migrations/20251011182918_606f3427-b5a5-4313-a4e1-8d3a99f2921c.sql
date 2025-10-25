-- Create review_templates table
CREATE TABLE IF NOT EXISTS public.review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  template_text TEXT NOT NULL,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active templates
CREATE POLICY "Anyone can view active review templates"
ON public.review_templates
FOR SELECT
USING (is_active = true);

-- RLS Policy: Admins can manage templates
CREATE POLICY "Admins can manage review templates"
ON public.review_templates
FOR ALL
USING (is_admin());

-- Insert default review templates
INSERT INTO public.review_templates (rating, template_text, category) VALUES
  (5, 'Excellent service! The product quality exceeded my expectations and the shop owner was very helpful.', 'general'),
  (5, 'Outstanding experience! Fast delivery, great quality, and professional service. Highly recommended!', 'general'),
  (4, 'Very good experience overall. Product was as described and service was professional.', 'general'),
  (4, 'Good quality products and responsive service. Would buy again.', 'general'),
  (3, 'Decent experience. Product was okay, nothing exceptional but met basic expectations.', 'general'),
  (3, 'Average service. Product was acceptable but there is room for improvement.', 'general'),
  (2, 'Below expectations. Product quality could be better and service needs improvement.', 'general'),
  (2, 'Not satisfied with the overall experience. Expected better quality for the price.', 'general'),
  (1, 'Poor experience. Product did not match description and service was unsatisfactory.', 'general'),
  (1, 'Very disappointed. Would not recommend based on my experience.', 'general');

-- Create customer-uploads storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-uploads', 'customer-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer uploads
CREATE POLICY "Authenticated users can upload to customer-uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'customer-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view customer uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'customer-uploads');

CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'customer-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);