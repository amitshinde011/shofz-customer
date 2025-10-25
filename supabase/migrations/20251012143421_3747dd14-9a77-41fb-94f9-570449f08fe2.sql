-- Function to check if user exists by email and their roles
CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_shop_role BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('exists', false);
  END IF;
  
  -- Check if user has shop_owner role
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = 'shop_owner' AND is_active = true
  ) INTO v_has_shop_role;
  
  RETURN json_build_object(
    'exists', true,
    'user_id', v_user_id,
    'has_shop_owner_role', v_has_shop_role
  );
END;
$$;

-- Function to add shop_owner role and create shop for existing users
CREATE OR REPLACE FUNCTION public.add_shop_owner_role_and_create_shop(
  p_user_id UUID,
  p_shop_name VARCHAR,
  p_shop_address TEXT,
  p_owner_name VARCHAR,
  p_owner_phone VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
  v_has_role BOOLEAN;
  v_user_email VARCHAR;
BEGIN
  -- Check if user already has shop_owner role
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = 'shop_owner' AND is_active = true
  ) INTO v_has_role;
  
  IF v_has_role THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already has shop owner role',
      'code', 'ALREADY_SHOP_OWNER'
    );
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM users WHERE id = p_user_id;
  
  -- Add shop_owner role
  INSERT INTO user_roles (user_id, role, is_active)
  VALUES (p_user_id, 'shop_owner', true)
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  
  -- Update user record with phone if provided
  IF p_owner_phone IS NOT NULL THEN
    UPDATE users 
    SET phone = p_owner_phone,
        name = COALESCE(name, p_owner_name)
    WHERE id = p_user_id;
  END IF;
  
  -- Create shop
  INSERT INTO shops (
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
    p_user_id,
    p_shop_name,
    p_shop_address,
    v_user_email,
    COALESCE(p_owner_phone, '0000000000'),
    true,
    false,
    'basic'
  )
  RETURNING id INTO v_shop_id;
  
  -- Create shop_owner_profiles record
  INSERT INTO shop_owner_profiles (user_id, business_name, business_phone)
  VALUES (p_user_id, p_shop_name, p_owner_phone)
  ON CONFLICT (user_id) DO UPDATE 
  SET business_name = EXCLUDED.business_name,
      business_phone = EXCLUDED.business_phone;
  
  RETURN json_build_object(
    'success', true,
    'shop_id', v_shop_id,
    'message', 'Shop owner role and shop created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'DATABASE_ERROR'
    );
END;
$$;