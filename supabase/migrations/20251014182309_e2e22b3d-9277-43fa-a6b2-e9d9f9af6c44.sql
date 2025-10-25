-- Phase 1: Database Schema Changes for Admin Shop and User Management

-- 1. Make owner_id nullable in shops table (allow shops without immediate owner)
ALTER TABLE public.shops 
ALTER COLUMN owner_id DROP NOT NULL;

COMMENT ON COLUMN public.shops.owner_id IS 'Shop owner user ID. Can be null for shops created by admin pending owner assignment.';

-- 2. Add RLS policies for admin to insert users
CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- 3. Add RLS policies for admin to manage user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_admin());

-- 4. Add helper function for assigning shop owner
CREATE OR REPLACE FUNCTION public.assign_shop_owner(
  p_shop_id UUID,
  p_user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_role BOOLEAN;
  v_current_owner_id UUID;
BEGIN
  -- Check if admin is calling this
  IF NOT is_admin() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get current owner
  SELECT owner_id INTO v_current_owner_id
  FROM shops
  WHERE id = p_shop_id;

  -- Check if user has shop_owner role
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = 'shop_owner' AND is_active = true
  ) INTO v_has_role;

  -- Add shop_owner role if user doesn't have it
  IF NOT v_has_role THEN
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (p_user_id, 'shop_owner', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  END IF;

  -- Update shop owner
  UPDATE shops
  SET owner_id = p_user_id,
      updated_at = now()
  WHERE id = p_shop_id;

  -- Create shop_owner_profiles if doesn't exist
  INSERT INTO shop_owner_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'message', 'Shop owner assigned successfully',
    'previous_owner', v_current_owner_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;