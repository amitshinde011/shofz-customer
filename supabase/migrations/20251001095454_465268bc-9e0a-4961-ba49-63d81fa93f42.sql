-- Add cost_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC;