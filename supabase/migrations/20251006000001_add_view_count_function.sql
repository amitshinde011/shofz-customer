-- ============================================================================
-- View Count Function - Optimized Query for viewanalytics
-- ============================================================================
-- This function provides an optimized way to get view counts from viewanalytics
-- Returns both total view count and last viewed timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_entity_view_count(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  view_count BIGINT,
  last_viewed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as view_count,
    MAX(created_at) as last_viewed_at
  FROM public.viewanalytics
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_entity_view_count(TEXT, UUID) TO authenticated;

-- Grant execute permission to anonymous users (for public view counts)
GRANT EXECUTE ON FUNCTION public.get_entity_view_count(TEXT, UUID) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_entity_view_count(TEXT, UUID) IS
  'Returns view count and last viewed timestamp for a given entity (product/shop/offer)';
