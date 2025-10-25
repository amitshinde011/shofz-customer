-- Create storage buckets for business media (skip if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('shop-logos', 'shop-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('shop-documents', 'shop-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Add product statistics tracking
CREATE TABLE IF NOT EXISTS product_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE product_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their product stats"
ON product_stats FOR SELECT
USING (
  product_id IN (
    SELECT id FROM products 
    WHERE shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  )
);

-- Add inventory movement tracking
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their inventory movements"
ON inventory_movements FOR SELECT
USING (
  product_id IN (
    SELECT id FROM products 
    WHERE shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Shop owners can insert inventory movements"
ON inventory_movements FOR INSERT
WITH CHECK (
  product_id IN (
    SELECT id FROM products 
    WHERE shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_stats_product_id ON product_stats(product_id);