-- Function to update shop location from lat/lng coordinates
CREATE OR REPLACE FUNCTION public.update_shop_location(
  p_shop_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate coordinates
  IF p_latitude < -90 OR p_latitude > 90 THEN
    RAISE EXCEPTION 'Invalid latitude: must be between -90 and 90';
  END IF;
  
  IF p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Invalid longitude: must be between -180 and 180';
  END IF;
  
  -- Update location using ST_SetSRID and ST_MakePoint
  -- Note: ST_MakePoint takes (longitude, latitude) as (X, Y)
  UPDATE shops
  SET 
    location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    updated_at = now()
  WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found with id: %', p_shop_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_shop_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) 
TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_shop_location IS 
'Updates shop location geometry from latitude and longitude coordinates. Uses SRID 4326 (WGS84 - standard GPS coordinates).';