-- Create get_nearby_products and get_nearby_offers functions
-- These functions join products/offers with nearby shops to avoid passing long lists of IDs
-- Apply this migration in Supabase Dashboard SQL Editor

-- ============================================================================
-- FUNCTION: get_nearby_products
-- Returns products from shops within a radius, with distance and shop info
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_nearby_products(double precision, double precision, double precision, text, text, numeric, numeric, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_products(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50.0,
  p_category text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  shop_id uuid,
  name varchar,
  description text,
  category varchar,
  subcategory text,
  brand text,
  sku text,
  price numeric,
  compare_at_price numeric,
  images text[],
  specifications jsonb,
  tags text[],
  stock_quantity integer,
  low_stock_threshold integer,
  inventory_tracking boolean,
  is_featured boolean,
  is_active boolean,
  featured_until timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Shop fields
  shop_name varchar,
  shop_address text,
  shop_logo_url text,
  shop_is_verified boolean,
  shop_rating numeric,
  shop_is_featured boolean,
  -- Distance
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.shop_id,
    p.name,
    p.description,
    p.category,
    p.subcategory,
    p.brand,
    p.sku,
    p.price,
    p.compare_at_price,
    p.images,
    p.specifications,
    p.tags,
    p.stock_quantity,
    p.low_stock_threshold,
    p.inventory_tracking,
    p.is_featured,
    p.is_active,
    p.featured_until,
    p.created_at,
    p.updated_at,
    -- Shop fields
    s.name as shop_name,
    s.address as shop_address,
    s.logo_url as shop_logo_url,
    s.is_verified as shop_is_verified,
    s.rating as shop_rating,
    s.is_featured as shop_is_featured,
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
    END as distance_km
  FROM public.products p
  INNER JOIN public.shops s ON p.shop_id = s.id
  WHERE 
    p.is_active = true
    AND s.is_active = true
    AND s.is_verified = true
    -- Distance filter
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
    -- Optional filters
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_query IS NULL OR (
      p.name ILIKE '%' || p_query || '%' OR 
      p.description ILIKE '%' || p_query || '%' OR
      p.brand ILIKE '%' || p_query || '%'
    ))
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_featured IS NULL OR p.is_featured = p_featured)
  ORDER BY distance_km ASC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- ============================================================================
-- FUNCTION: get_nearby_offers
-- Returns offers from shops within a radius, with distance and shop info
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_nearby_offers(double precision, double precision, double precision, integer, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_offers(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50.0,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  shop_id uuid,
  title varchar,
  description text,
  discount_type varchar,
  discount_value numeric,
  discount_percentage integer,
  offer_type varchar,
  applicable_to varchar,
  applicable_categories text[],
  applicable_products text[],
  terms_conditions text,
  image_url text,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  is_active boolean,
  is_featured boolean,
  featured_until timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Shop fields
  shop_name varchar,
  shop_address text,
  shop_logo_url text,
  shop_is_verified boolean,
  shop_is_featured boolean,
  -- Distance
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.shop_id,
    o.title,
    o.description,
    o.discount_type,
    o.discount_value,
    o.discount_percentage,
    o.offer_type,
    o.applicable_to,
    o.applicable_categories,
    o.applicable_products,
    o.terms_conditions,
    o.image_url,
    o.valid_from,
    o.valid_until,
    o.is_active,
    o.is_featured,
    o.featured_until,
    o.created_at,
    o.updated_at,
    -- Shop fields
    s.name as shop_name,
    s.address as shop_address,
    s.logo_url as shop_logo_url,
    s.is_verified as shop_is_verified,
    s.is_featured as shop_is_featured,
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
    END as distance_km
  FROM public.offers o
  INNER JOIN public.shops s ON o.shop_id = s.id
  WHERE 
    o.is_active = true
    AND s.is_active = true
    AND s.is_verified = true
    -- Valid offers only (started and not expired)
    AND (o.valid_from IS NULL OR o.valid_from <= NOW())
    AND (o.valid_until IS NULL OR o.valid_until >= NOW())
    -- Distance filter
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
  ORDER BY distance_km ASC, o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_nearby_products TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_offers TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_nearby_products IS 'Returns products from nearby shops with distance calculation. Avoids passing large lists of shop IDs in query parameters.';
COMMENT ON FUNCTION public.get_nearby_offers IS 'Returns valid offers from nearby shops with distance calculation. Avoids passing large lists of shop IDs in query parameters.';
