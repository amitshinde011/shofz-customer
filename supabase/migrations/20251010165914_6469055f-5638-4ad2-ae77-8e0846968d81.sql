-- Add trigger to automatically create shop credits when a new shop is created
CREATE TRIGGER on_shop_created
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_shop_credits();