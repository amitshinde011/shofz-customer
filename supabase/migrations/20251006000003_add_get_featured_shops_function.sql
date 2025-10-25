-- Create function to get featured shops with extracted lat/lng coordinates
CREATE OR REPLACE FUNCTION public.get_featured_shops(shop_limit INTEGER DEFAULT 10)
RETURNS SETOF RECORD
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.*,
    ST_Y(s.location::geometry) as latitude,
    ST_X(s.location::geometry) as longitude
  FROM public.shops s
  WHERE s.is_active = true
    AND s.is_verified = true
  ORDER BY s.rating DESC, s.total_reviews DESC
  LIMIT shop_limit;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_featured_shops(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_featured_shops(INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_featured_shops IS 'Get featured shops with extracted latitude and longitude from PostGIS location';
