-- Create customer_payment_preferences table
CREATE TABLE IF NOT EXISTS public.customer_payment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_payment_app VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_payment_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own preferences
CREATE POLICY "Customers can view own payment preferences"
  ON public.customer_payment_preferences
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Policy: Customers can insert their own preferences
CREATE POLICY "Customers can insert own payment preferences"
  ON public.customer_payment_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can update their own preferences
CREATE POLICY "Customers can update own payment preferences"
  ON public.customer_payment_preferences
  FOR UPDATE
  USING (auth.uid() = customer_id);

-- Add index for faster lookups
CREATE INDEX idx_customer_payment_prefs_customer_id 
  ON public.customer_payment_preferences(customer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_customer_payment_preferences_updated_at
  BEFORE UPDATE ON public.customer_payment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();