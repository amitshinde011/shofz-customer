-- Fix handle_new_user trigger to get phone from metadata and set correct role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  user_phone TEXT;
  user_role user_role;
BEGIN
  -- Get phone from metadata or use phone column as fallback
  user_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    '0000000000'
  );
  
  -- Determine role based on metadata
  -- If shopName exists in metadata, user is a shop_owner
  IF NEW.raw_user_meta_data->>'shopName' IS NOT NULL THEN
    user_role := 'shop_owner';
  ELSE
    user_role := 'customer';
  END IF;
  
  INSERT INTO public.users (
    id, 
    phone_number, 
    role, 
    is_active,
    name,
    email
  )
  VALUES (
    NEW.id,
    user_phone,
    user_role,
    true,
    NEW.raw_user_meta_data->>'name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;