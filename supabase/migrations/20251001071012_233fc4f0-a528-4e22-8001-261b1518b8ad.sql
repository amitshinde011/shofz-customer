-- Create function to handle new shop creation for shop owners
CREATE OR REPLACE FUNCTION public.handle_new_shop_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create shop if user is a shop_owner
  IF NEW.role = 'shop_owner' THEN
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
      'My Shop', -- Default name, can be updated later
      NEW.address,
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

-- Create trigger to automatically create shop when shop owner user is created
DROP TRIGGER IF EXISTS on_shop_owner_created ON public.users;
CREATE TRIGGER on_shop_owner_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_shop_owner();