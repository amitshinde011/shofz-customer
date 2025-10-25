-- ============================================================================
-- Test: Can Anonymous Users Read View Counts?
-- ============================================================================

-- This simulates what happens when a non-logged-in user visits your site
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies
SELECT
  policyname,
  CASE
    WHEN roles::text LIKE '%anon%' THEN '✓ Allows anonymous'
    WHEN roles::text LIKE '%public%' THEN '✓ Allows everyone (including anonymous)'
    WHEN roles::text LIKE '%authenticated%' THEN '✗ Only authenticated users'
    ELSE roles::text
  END as access_level,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'viewanalytics';

-- EXPECTED: Should see SELECT and INSERT policies that allow 'anon' or 'public'
-- IF NOT: Run migration 20251006000002_fix_viewanalytics_rls_for_anon.sql

-- 2. Test anonymous read access (simulates what your app does)
-- This uses 'anon' role to simulate non-logged-in user
SET ROLE anon;
SELECT COUNT(*) as can_read_count FROM viewanalytics;
RESET ROLE;

-- EXPECTED: Should return a number (even if 0)
-- IF ERROR "permission denied": RLS policy is blocking anonymous reads

-- 3. Test if anonymous users can see the function result
SET ROLE anon;
DO $$
DECLARE
  v_test_id UUID;
  v_result RECORD;
BEGIN
  -- Get a sample entity ID
  SELECT entity_id INTO v_test_id
  FROM viewanalytics
  LIMIT 1;

  IF v_test_id IS NOT NULL THEN
    -- Try to call the function as anonymous user
    SELECT * INTO v_result
    FROM get_entity_view_count('product', v_test_id);

    RAISE NOTICE '✓ SUCCESS: Anonymous user can read view counts!';
    RAISE NOTICE 'Sample view count: %', v_result.view_count;
  ELSE
    RAISE NOTICE 'No test data available';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR: Anonymous user cannot read view counts: %', SQLERRM;
END $$;
RESET ROLE;

-- 4. Quick fix if policies are wrong
-- Uncomment and run these lines if tests above failed:

/*
DROP POLICY IF EXISTS "Users can insert their own views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Authenticated users can read all views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Anonymous users can insert guest views" ON public.viewanalytics;

CREATE POLICY "Anyone can read view analytics"
  ON public.viewanalytics
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert view analytics"
  ON public.viewanalytics
  FOR INSERT
  WITH CHECK (true);

-- Now re-run tests above
*/
