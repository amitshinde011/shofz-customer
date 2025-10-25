-- Enable RLS on tables that don't have it
ALTER TABLE IF EXISTS public.product_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entityviewcounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shop_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inquiry_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Add admin policies for tables that need them
DROP POLICY IF EXISTS "Admins can view product stats" ON public.product_stats;
CREATE POLICY "Admins can view product stats"
  ON public.product_stats FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Admins can view inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view entity view counts" ON public.entityviewcounts;
CREATE POLICY "Admins can view entity view counts"
  ON public.entityviewcounts FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage verification docs" ON public.shop_verification_documents;
CREATE POLICY "Admins can manage verification docs"
  ON public.shop_verification_documents FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view order items" ON public.order_items;
CREATE POLICY "Admins can view order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view inquiry shops" ON public.inquiry_shops;
CREATE POLICY "Admins can view inquiry shops"
  ON public.inquiry_shops FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view user favorites" ON public.user_favorites;
CREATE POLICY "Admins can view user favorites"
  ON public.user_favorites FOR SELECT
  USING (public.is_admin());

-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type character varying, p_title character varying, p_message text, p_related_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_shop_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.users (id, phone_number, role, is_active)
  VALUES (
    NEW.id,
    NEW.phone,
    'customer',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;