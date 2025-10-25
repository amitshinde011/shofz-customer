-- Check if get_nearby_shops function exists, if not create it
CREATE OR REPLACE FUNCTION public.get_nearby_shops(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  categories TEXT[],
  address TEXT,
  phone_number VARCHAR,
  logo_url TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  is_verified BOOLEAN,
  subscription_tier subscription_tier,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.categories,
    s.address,
    s.phone_number,
    s.logo_url,
    s.rating,
    s.total_reviews,
    s.is_verified,
    s.subscription_tier,
    CASE 
      WHEN s.location IS NOT NULL THEN
        6371 * acos(
          cos(radians(user_lat)) * 
          cos(radians(ST_Y(s.location::geometry))) * 
          cos(radians(ST_X(s.location::geometry)) - radians(user_lng)) + 
          sin(radians(user_lat)) * 
          sin(radians(ST_Y(s.location::geometry)))
        )
      ELSE 999.0
    END as distance_km
  FROM shops s
  WHERE 
    s.is_active = true
    AND (
      s.location IS NULL OR
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(ST_Y(s.location::geometry))) * 
        cos(radians(ST_X(s.location::geometry)) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(ST_Y(s.location::geometry)))
      ) <= radius_km
    )
  ORDER BY distance_km ASC, s.rating DESC;
END;
$$;

-- Also need to update the inquiries table to support multiple shops
-- Add a new table for inquiry_shops to handle many-to-many relationship
CREATE TABLE IF NOT EXISTS public.inquiry_shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  status inquiry_status DEFAULT 'pending',
  shop_response TEXT,
  shop_response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(inquiry_id, shop_id)
);

-- Enable RLS on inquiry_shops
ALTER TABLE public.inquiry_shops ENABLE ROW LEVEL SECURITY;

-- RLS policies for inquiry_shops
CREATE POLICY "Customers can view their inquiry shops" 
ON public.inquiry_shops 
FOR SELECT 
USING (
  inquiry_id IN (
    SELECT id FROM inquiries WHERE customer_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can view and update their inquiry shops" 
ON public.inquiry_shops 
FOR ALL
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Create function to update inquiry_shops updated_at
CREATE OR REPLACE FUNCTION public.update_inquiry_shops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inquiry_shops
CREATE TRIGGER update_inquiry_shops_updated_at
  BEFORE UPDATE ON public.inquiry_shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_shops_updated_at();