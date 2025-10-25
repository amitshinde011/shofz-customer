-- ============================================================================
-- Fix RLS Policies for Anonymous Users
-- ============================================================================
-- This allows view counts to work for both logged-in and anonymous users
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Authenticated users can read all views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Anonymous users can insert guest views" ON public.viewanalytics;

-- Create new policies that work for BOTH authenticated and anonymous users

-- Allow EVERYONE (authenticated + anonymous) to read view counts
CREATE POLICY "Anyone can read view analytics"
  ON public.viewanalytics
  FOR SELECT
  USING (true);

-- Allow EVERYONE (authenticated + anonymous) to insert views
CREATE POLICY "Anyone can insert view analytics"
  ON public.viewanalytics
  FOR INSERT
  WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Anyone can read view analytics" ON public.viewanalytics IS
  'Allows both authenticated and anonymous users to read view counts for displaying on UI';

COMMENT ON POLICY "Anyone can insert view analytics" ON public.viewanalytics IS
  'Allows both authenticated and anonymous users to track views when visiting pages';
