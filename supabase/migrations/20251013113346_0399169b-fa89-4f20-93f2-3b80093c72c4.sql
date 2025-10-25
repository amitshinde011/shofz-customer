-- Add foreign key relationship between inquiries and shops
ALTER TABLE public.inquiries
ADD CONSTRAINT inquiries_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;