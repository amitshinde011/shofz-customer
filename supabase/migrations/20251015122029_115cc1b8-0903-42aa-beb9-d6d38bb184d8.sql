-- Create shop_categories table for system-supported categories
CREATE TABLE IF NOT EXISTS public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active categories"
ON public.shop_categories
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.shop_categories
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Insert default categories
INSERT INTO public.shop_categories (name, slug, description, display_order) VALUES
  ('Electronics', 'electronics', 'Electronic devices and accessories', 1),
  ('Fashion', 'fashion', 'Clothing, footwear, and accessories', 2),
  ('Home & Garden', 'home-garden', 'Home decor, furniture, and garden supplies', 3),
  ('Food & Beverages', 'food-beverages', 'Restaurants, cafes, and food stores', 4),
  ('Health & Beauty', 'health-beauty', 'Health products, cosmetics, and beauty services', 5),
  ('Sports & Fitness', 'sports-fitness', 'Sports equipment and fitness services', 6),
  ('Automotive', 'automotive', 'Auto parts, repairs, and services', 7),
  ('Books & Stationery', 'books-stationery', 'Books, office supplies, and stationery', 8),
  ('Jewelry & Accessories', 'jewelry-accessories', 'Jewelry, watches, and fashion accessories', 9),
  ('Pet Supplies', 'pet-supplies', 'Pet food, toys, and accessories', 10),
  ('Toys & Games', 'toys-games', 'Toys, games, and hobby supplies', 11),
  ('Services', 'services', 'Professional and personal services', 12)
ON CONFLICT (slug) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_shop_categories_updated_at
  BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();