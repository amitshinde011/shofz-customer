-- Fix get_nearby_shops to sort by distance first (remove featured sorting)
-- Featured sorting is now handled client-side after fetching nearest items
-- Apply this migration in Supabase Dashboard SQL Editor

DROP FUNCTION IF EXISTS public.get_nearby_shops(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_nearby_shops(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 10.0
)
RETURNS TABLE(
  id uuid,
  name character varying,
  categories text[],
  address text,
  phone_number character varying,
  logo_url text,
  rating numeric,
  total_reviews integer,
  is_verified boolean,
  is_featured boolean,
  subscription_tier subscription_tier,
  distance_km double precision,
  latitude double precision,
  longitude double precision,
  owner_id uuid,
  slug character varying,
  description text,
  email character varying,
  cover_image_url text,
  gallery_images text[],
  business_hours jsonb,
  is_active boolean,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Delivery fields
  delivery_available boolean,
  delivery_coverage_km numeric,
  delivery_charge_per_km numeric,
  free_delivery_above numeric,
  delivery_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    s.is_featured,
    s.subscription_tier,
    -- Distance calculation
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
    END as distance_km,
    -- Latitude
    CASE 
      WHEN s.location IS NOT NULL THEN ST_Y(s.location::geometry)
      ELSE NULL
    END as latitude,
    -- Longitude
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
    s.updated_at,
    -- Delivery fields
    s.delivery_available,
    s.delivery_coverage_km,
    s.delivery_charge_per_km,
    s.free_delivery_above,
    s.delivery_notes
  FROM public.shops s
  WHERE 
    s.is_active = true
    AND s.is_verified = true
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
  -- CHANGED: Sort by distance first, then by rating (featured sorting is done client-side)
  ORDER BY distance_km ASC, s.rating DESC;
END;
$function$;
