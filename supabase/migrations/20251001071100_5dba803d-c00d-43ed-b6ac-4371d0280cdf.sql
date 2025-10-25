-- Update function to read shop data from user metadata passed during signup
CREATE OR REPLACE FUNCTION public.handle_new_shop_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Only create shop if user is a shop_owner
  IF NEW.role = 'shop_owner' THEN
    -- Get the auth user data to access metadata
    SELECT * INTO auth_user FROM auth.users WHERE id = NEW.id;
    
    INSERT INTO public.shops (
      owner_id,
      name,
      address,
      email,
      phone_number,
      is_active,
      is_verified,
      subscription_tier
    )
    VALUES (
      NEW.id,
      COALESCE(auth_user.raw_user_meta_data->>'shopName', 'My Shop'),
      COALESCE(auth_user.raw_user_meta_data->>'shopAddress', NEW.address),
      NEW.email,
      NEW.phone_number,
      true,
      false,
      'basic'
    );
  END IF;
  RETURN NEW;
END;
$$;