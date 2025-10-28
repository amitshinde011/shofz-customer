-- =====================================================
-- MIGRATION: Add app_type metadata support
-- =====================================================
-- This migration updates the handle_new_user() trigger to check app_type metadata
-- Allows differentiation between Customer App and Business App signups
--
-- HOW TO APPLY:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  should_add_customer boolean := false;
  app_type_value text;
BEGIN
  -- 1. Create or update user record (handles existing users from other apps)
  INSERT INTO public.users (id, email, name, email_verified, email_verified_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    email_verified_at = EXCLUDED.email_verified_at,
    updated_at = now();
  
  -- 2. Check if customer role should be skipped (for admin-created users)
  IF NEW.raw_user_meta_data->>'skip_customer_role' = 'true' THEN
    RETURN NEW; -- Exit early, don't add any role
  END IF;
  
  -- 3. Get app_type from metadata
  app_type_value := NEW.raw_user_meta_data->>'app_type';
  
  -- 4. Determine which role to add based on app_type
  IF app_type_value = 'customer' THEN
    should_add_customer := true;
  ELSIF app_type_value = 'business' THEN
    should_add_customer := false; -- Business app doesn't get customer role
  ELSE
    -- Default to customer for backward compatibility (when app_type is missing)
    should_add_customer := true;
  END IF;
  
  -- 5. Add customer role only if determined
  IF should_add_customer THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- 6. Create customer profile only if adding customer role
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update comment to document app_type metadata
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function for new user creation.
- Set user_metadata.app_type = "customer" for Customer App signups
- Set user_metadata.app_type = "business" for Business App signups  
- Set user_metadata.skip_customer_role = "true" to prevent automatic role assignment (admin use)
- Defaults to customer role if app_type is not specified (backward compatibility)';

-- =====================================================
-- VERIFICATION QUERIES (optional - run after migration)
-- =====================================================

-- Check if the function was updated successfully
-- SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Test with a new signup and verify metadata
-- SELECT id, email, raw_user_meta_data->>'app_type' as app_type 
-- FROM auth.users 
-- WHERE email = 'your-test-email@example.com';
