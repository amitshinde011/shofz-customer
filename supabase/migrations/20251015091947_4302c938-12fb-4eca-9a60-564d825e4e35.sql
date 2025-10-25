-- Update handle_new_user trigger to respect role selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  should_add_customer boolean := true;
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
  
  -- 2. Check if customer role should be skipped
  -- When admin creates user with specific roles, this flag is set
  IF NEW.raw_user_meta_data->>'skip_customer_role' = 'true' THEN
    should_add_customer := false;
  END IF;
  
  -- 3. Add customer role only if not skipped
  IF should_add_customer THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- 4. Create customer profile only if adding customer role
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment explaining the skip_customer_role flag
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function for new user creation. Set user_metadata.skip_customer_role = "true" to prevent automatic customer role assignment.';