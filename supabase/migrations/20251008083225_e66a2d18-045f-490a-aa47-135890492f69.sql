-- Create get_featured_shops function
CREATE OR REPLACE FUNCTION public.get_featured_shops(shop_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  name varchar,
  categories text[],
  address text,
  phone_number varchar,
  logo_url text,
  rating numeric,
  total_reviews integer,
  is_verified boolean,
  subscription_tier subscription_tier,
  latitude double precision,
  longitude double precision,
  owner_id uuid,
  slug varchar,
  description text,
  email varchar,
  cover_image_url text,
  gallery_images text[],
  business_hours jsonb,
  is_active boolean,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      WHEN s.location IS NOT NULL THEN ST_Y(s.location::geometry)
      ELSE NULL
    END as latitude,
    CASE 
      WHEN s.location IS NOT NULL THEN ST_X(s.location::geometry)
      ELSE NULL
    END as longitude,
    s.owner_id,
    s.slug,
    s.description,
    s.email,
    s.cover_image_url,
    s.gallery_images,
    s.business_hours,
    s.is_active,
    s.subscription_expires_at,
    s.created_at,
    s.updated_at
  FROM public.shops s
  WHERE 
    s.is_active = true
    AND s.is_verified = true
    AND s.subscription_tier IN ('premium', 'enterprise')
  ORDER BY s.rating DESC, s.total_reviews DESC
  LIMIT shop_limit;
END;
$$;