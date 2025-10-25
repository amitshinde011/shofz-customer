-- Create a function to get shop data with location as GeoJSON
CREATE OR REPLACE FUNCTION public.get_shop_with_location(p_owner_id UUID)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name VARCHAR,
  slug VARCHAR,
  description TEXT,
  categories TEXT[],
  location_geojson TEXT,
  address TEXT,
  business_hours JSONB,
  phone_number VARCHAR,
  email VARCHAR,
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[],
  rating NUMERIC,
  total_reviews INTEGER,
  is_verified BOOLEAN,
  is_active BOOLEAN,
  subscription_tier subscription_tier,
  subscription_expires_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.owner_id,
    s.name,
    s.slug,
    s.description,
    s.categories,
    CASE 
      WHEN s.location IS NOT NULL THEN ST_AsGeoJSON(s.location)::TEXT
      ELSE NULL
    END as location_geojson,
    s.address,
    s.business_hours,
    s.phone_number,
    s.email,
    s.logo_url,
    s.cover_image_url,
    s.gallery_images,
    s.rating,
    s.total_reviews,
    s.is_verified,
    s.is_active,
    s.subscription_tier,
    s.subscription_expires_at,
    s.search_vector,
    s.created_at,
    s.updated_at
  FROM public.shops s
  WHERE s.owner_id = p_owner_id
  LIMIT 1;
END;
$$;