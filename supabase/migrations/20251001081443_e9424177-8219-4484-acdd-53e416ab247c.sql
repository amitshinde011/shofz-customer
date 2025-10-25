-- Clean up orphaned user data and ensure proper shop creation

DO $$
DECLARE
  current_auth_user_id uuid := 'e39cf5b0-9d71-4cff-844b-f86a62485804';
  orphaned_user_id uuid := 'c77c3f97-ff9b-4255-a4d6-71363ab37a52';
  auth_user_record RECORD;
  shop_exists boolean;
BEGIN
  -- Delete related records first (cascade manually)
  DELETE FROM analytics_events WHERE user_id = orphaned_user_id;
  DELETE FROM user_favorites WHERE user_id = orphaned_user_id;
  DELETE FROM notifications WHERE user_id = orphaned_user_id;
  DELETE FROM reviews WHERE customer_id = orphaned_user_id;
  DELETE FROM orders WHERE customer_id = orphaned_user_id;
  DELETE FROM inquiries WHERE customer_id = orphaned_user_id;
  DELETE FROM messages WHERE sender_id = orphaned_user_id;
  
  -- Now delete the orphaned public.users entry
  DELETE FROM public.users WHERE id = orphaned_user_id;
  
  -- Get the auth user data
  SELECT * INTO auth_user_record FROM auth.users WHERE id = current_auth_user_id;
  
  -- Manually create the public.users entry for the current auth user
  INSERT INTO public.users (id, name, email, phone_number, role, is_active)
  VALUES (
    current_auth_user_id,
    auth_user_record.raw_user_meta_data->>'name',
    auth_user_record.email,
    auth_user_record.raw_user_meta_data->>'phone',
    'shop_owner'::user_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Check if shop already exists
  SELECT EXISTS(SELECT 1 FROM public.shops WHERE owner_id = current_auth_user_id) INTO shop_exists;
  
  -- Create the shop if it doesn't exist
  IF NOT shop_exists THEN
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
      current_auth_user_id,
      COALESCE(auth_user_record.raw_user_meta_data->>'shopName', 'My Shop'),
      COALESCE(auth_user_record.raw_user_meta_data->>'shopAddress', 'Address not provided'),
      auth_user_record.email,
      auth_user_record.raw_user_meta_data->>'phone',
      true,
      false,
      'basic'
    );
  END IF;
END $$;

-- Update the handle_new_user trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, name, email, phone_number, role, is_active)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '0000000000'),
    'shop_owner'::user_role,
    true
  )
  ON CONFLICT (phone_number) DO UPDATE
  SET 
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Update the handle_new_shop_owner function to be more robust  
CREATE OR REPLACE FUNCTION public.handle_new_shop_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  auth_user RECORD;
  shop_exists boolean;
BEGIN
  IF NEW.role = 'shop_owner' THEN
    SELECT * INTO auth_user FROM auth.users WHERE id = NEW.id;
    
    -- Check if shop already exists
    SELECT EXISTS(SELECT 1 FROM public.shops WHERE owner_id = NEW.id) INTO shop_exists;
    
    IF NOT shop_exists THEN
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
        COALESCE(auth_user.raw_user_meta_data->>'shopAddress', NEW.address, 'Address not provided'),
        COALESCE(NEW.email, auth_user.email),
        COALESCE(NEW.phone_number, '0000000000'),
        true,
        false,
        'basic'
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_shop_owner: %', SQLERRM;
    RETURN NEW;
END;
$function$;