-- ============================================================================
-- Quick Test: View Counts Setup
-- ============================================================================
-- Run this entire script in Supabase SQL Editor to test everything at once
-- ============================================================================

-- Test 1: Check if viewanalytics table exists and has data
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM viewanalytics;
  RAISE NOTICE '✓ viewanalytics table exists. Total records: %', v_count;

  IF v_count = 0 THEN
    RAISE NOTICE '⚠ WARNING: viewanalytics table is EMPTY. No views have been tracked yet.';
    RAISE NOTICE '→ Solution: Visit a product/shop/offer page to track your first view.';
  END IF;
END $$;

-- Test 2: Check column structure
DO $$
DECLARE
  v_has_created_at BOOLEAN;
  v_has_viewed_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'viewanalytics'
    AND column_name = 'created_at'
  ) INTO v_has_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'viewanalytics'
    AND column_name = 'viewed_at'
  ) INTO v_has_viewed_at;

  IF v_has_created_at THEN
    RAISE NOTICE '✓ Column "created_at" exists';
  END IF;

  IF v_has_viewed_at THEN
    RAISE NOTICE '✓ Column "viewed_at" exists';
  END IF;

  IF NOT v_has_created_at AND NOT v_has_viewed_at THEN
    RAISE EXCEPTION '✗ ERROR: Neither "created_at" nor "viewed_at" column exists!';
  END IF;
END $$;

-- Test 3: Check if indexes exist
DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'viewanalytics'
  AND schemaname = 'public'
  AND indexname LIKE '%entity%';

  IF v_index_count > 0 THEN
    RAISE NOTICE '✓ Indexes on viewanalytics exist (count: %)', v_index_count;
  ELSE
    RAISE NOTICE '⚠ WARNING: No entity indexes found. Performance may be slow.';
    RAISE NOTICE '→ Solution: Run migration 20251006000000_add_viewanalytics_indexes.sql';
  END IF;
END $$;

-- Test 4: Check if RPC function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_entity_view_count'
  ) THEN
    RAISE NOTICE '✓ RPC function "get_entity_view_count" exists';
  ELSE
    RAISE NOTICE '⚠ WARNING: RPC function "get_entity_view_count" does not exist.';
    RAISE NOTICE '→ Solution: Run migration 20251006000001_add_view_count_function.sql';
    RAISE NOTICE '→ App will use fallback COUNT query (slower but works)';
  END IF;
END $$;

-- Test 5: Check RLS policies
DO $$
DECLARE
  v_select_policies INTEGER;
  v_insert_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_select_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'viewanalytics'
  AND cmd = 'SELECT';

  SELECT COUNT(*) INTO v_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'viewanalytics'
  AND cmd = 'INSERT';

  IF v_select_policies > 0 THEN
    RAISE NOTICE '✓ SELECT policies exist (count: %)', v_select_policies;
  ELSE
    RAISE NOTICE '✗ ERROR: No SELECT policies on viewanalytics!';
    RAISE NOTICE '→ This will block view count reads!';
  END IF;

  IF v_insert_policies > 0 THEN
    RAISE NOTICE '✓ INSERT policies exist (count: %)', v_insert_policies;
  ELSE
    RAISE NOTICE '✗ ERROR: No INSERT policies on viewanalytics!';
    RAISE NOTICE '→ This will block view tracking!';
  END IF;
END $$;

-- Test 6: Try to read from viewanalytics (tests RLS SELECT)
DO $$
DECLARE
  v_can_read BOOLEAN := false;
BEGIN
  BEGIN
    PERFORM 1 FROM viewanalytics LIMIT 1;
    v_can_read := true;
  EXCEPTION WHEN OTHERS THEN
    v_can_read := false;
  END;

  IF v_can_read THEN
    RAISE NOTICE '✓ Can read from viewanalytics table';
  ELSE
    RAISE NOTICE '✗ ERROR: Cannot read from viewanalytics table!';
    RAISE NOTICE '→ RLS policy is blocking reads. Run Fix 2 from TROUBLESHOOT_VIEWS.md';
  END IF;
END $$;

-- Test 7: Get sample data distribution
SELECT
  entity_type,
  COUNT(*) as total_views,
  COUNT(DISTINCT entity_id) as unique_entities,
  MAX(created_at) as last_view_time
FROM viewanalytics
GROUP BY entity_type
ORDER BY entity_type;

-- Test 8: If data exists, test the RPC function
DO $$
DECLARE
  v_sample_id UUID;
  v_sample_type TEXT;
  v_count BIGINT;
BEGIN
  -- Get a sample entity with views
  SELECT entity_id, entity_type INTO v_sample_id, v_sample_type
  FROM viewanalytics
  LIMIT 1;

  IF v_sample_id IS NOT NULL THEN
    -- Test RPC function
    BEGIN
      SELECT view_count INTO v_count
      FROM get_entity_view_count(v_sample_type, v_sample_id);

      RAISE NOTICE '✓ RPC function works! Sample % has % views', v_sample_type, v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠ WARNING: RPC function error: %', SQLERRM;
      RAISE NOTICE '→ App will use fallback query';
    END;
  ELSE
    RAISE NOTICE '⚠ No sample data to test RPC function';
  END IF;
END $$;

-- Summary
RAISE NOTICE '========================================';
RAISE NOTICE 'SETUP TEST COMPLETE';
RAISE NOTICE '========================================';
RAISE NOTICE 'Check messages above for any ✗ ERROR or ⚠ WARNING';
RAISE NOTICE 'If all checks passed, view counts should work!';
RAISE NOTICE '========================================';
