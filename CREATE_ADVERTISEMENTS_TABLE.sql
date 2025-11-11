-- ============================================
-- ADVERTISEMENT SYSTEM - DATABASE SCHEMA
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('carousel', 'banner')),
  placement VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_advertisements_active ON advertisements(is_active, ad_type, placement) WHERE is_active = true;
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

-- RLS Policies
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active ads
CREATE POLICY "Anyone can view active advertisements"
  ON advertisements
  FOR SELECT
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- Admin users can manage ads
CREATE POLICY "Admins can manage advertisements"
  ON advertisements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.is_active = true
    )
  );

-- Function to update impression count
CREATE OR REPLACE FUNCTION increment_ad_impression(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE advertisements
  SET impression_count = impression_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update click count
CREATE OR REPLACE FUNCTION increment_ad_click(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE advertisements
  SET click_count = click_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- INSERT INTO advertisements (title, description, image_url, ad_type, placement, priority)
-- VALUES 
--   ('Summer Sale', 'Get 50% off on all electronics', 'https://example.com/summer-sale.jpg', 'carousel', 'home-top', 10),
--   ('New Arrivals', 'Check out our latest products', 'https://example.com/new-arrivals.jpg', 'banner', 'after-featured-shops', 5);
