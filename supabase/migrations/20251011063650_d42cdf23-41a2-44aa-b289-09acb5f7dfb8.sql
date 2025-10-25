-- Add payment settings columns to shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_upi_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.shops.accepts_online_payments IS 'Whether the shop accepts online payments through the app';
COMMENT ON COLUMN public.shops.payment_upi_id IS 'UPI ID for receiving payments';
COMMENT ON COLUMN public.shops.payment_phone_number IS 'Phone number linked to payment apps';
COMMENT ON COLUMN public.shops.payment_qr_code_url IS 'URL to the payment QR code image';
COMMENT ON COLUMN public.shops.preferred_payment_methods IS 'Array of preferred payment methods (upi, cash, card)';
COMMENT ON COLUMN public.shops.payment_instructions IS 'Custom payment instructions for customers';