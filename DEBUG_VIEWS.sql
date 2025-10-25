-- ============================================================================
-- DEBUG: Why Views Aren't Showing
-- ============================================================================
-- Run these queries in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- 1. Check if viewanalytics table has data
SELECT
  entity_type,
  COUNT(*) as total_views,
  COUNT(DISTINCT entity_id) as unique_entities
FROM viewanalytics
GROUP BY entity_type;
-- EXPECTED: Should show counts for 'product', 'shop', 'offer'
-- IF EMPTY: Views are not being tracked at all

-- 2. Check a sample of viewanalytics data
SELECT
  entity_type,
  entity_id,
  viewer_type,
  created_at
FROM viewanalytics
ORDER BY created_at DESC
LIMIT 10;
-- EXPECTED: Should show recent view records
-- Check the entity_id values - do they match real product/shop/offer IDs?

-- 3. Test the RPC function directly
-- First, get a product ID that has views
SELECT entity_id, COUNT(*) as views
FROM viewanalytics
WHERE entity_type = 'product'
GROUP BY entity_id
ORDER BY views DESC
LIMIT 1;

-- Now test the function with that product ID (replace with actual ID from above)
-- SELECT * FROM get_entity_view_count('product', 'PASTE_PRODUCT_ID_HERE');
-- EXPECTED: Should return view_count and last_viewed_at

-- 4. Check if indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'viewanalytics'
AND schemaname = 'public';
-- EXPECTED: Should see idx_viewanalytics_entity_type_id and others

-- 5. Check RLS policies on viewanalytics (might be blocking reads)
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'viewanalytics';
-- EXPECTED: Should allow SELECT for authenticated users

-- 6. Test if you can read viewanalytics directly
SELECT COUNT(*) FROM viewanalytics;
-- IF ERROR: RLS policy is blocking you

-- 7. Check column names in viewanalytics
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'viewanalytics'
ORDER BY ordinal_position;
-- IMPORTANT: Check if column is named 'created_at' or 'viewed_at'

-- 8. Get sample product/shop/offer IDs to test
SELECT id, name FROM products LIMIT 3;
SELECT id, name FROM shops LIMIT 3;
SELECT id, title FROM offers LIMIT 3;

-- 9. Check if any of these items have views
-- Replace IDs with actual IDs from query 8
-- SELECT COUNT(*) FROM viewanalytics WHERE entity_type = 'product' AND entity_id = 'YOUR_PRODUCT_ID';
-- SELECT COUNT(*) FROM viewanalytics WHERE entity_type = 'shop' AND entity_id = 'YOUR_SHOP_ID';
-- SELECT COUNT(*) FROM viewanalytics WHERE entity_type = 'offer' AND entity_id = 'YOUR_OFFER_ID';
