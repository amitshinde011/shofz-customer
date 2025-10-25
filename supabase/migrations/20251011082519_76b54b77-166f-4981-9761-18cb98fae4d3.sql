-- Create customer payment preferences table
CREATE TABLE IF NOT EXISTS public.customer_payment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_payment_app VARCHAR(50),
  installed_payment_apps TEXT[],
  payment_app_priorities JSONB DEFAULT '[]'::jsonb,
  auto_launch_preferred BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id)
);

-- Create payment analytics table
CREATE TABLE IF NOT EXISTS public.payment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payment_app VARCHAR(50),
  device_info JSONB,
  user_agent TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_payment_prefs_customer ON public.customer_payment_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_request ON public.payment_analytics(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_event ON public.payment_analytics(event_type);

-- Enable RLS
ALTER TABLE public.customer_payment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_payment_preferences
CREATE POLICY "Users can manage their own payment preferences"
  ON public.customer_payment_preferences
  FOR ALL
  USING (auth.uid() = customer_id);

-- RLS policies for payment_analytics
CREATE POLICY "Users can view their payment analytics"
  ON public.payment_analytics
  FOR SELECT
  USING (
    payment_request_id IN (
      SELECT id FROM public.payment_requests
      WHERE customer_id = auth.uid() OR shop_id IN (
        SELECT id FROM public.shops WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert payment analytics"
  ON public.payment_analytics
  FOR INSERT
  WITH CHECK (true);