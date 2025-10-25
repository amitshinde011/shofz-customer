-- Create inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_details TEXT,
  quantity INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inquiries"
ON public.inquiries FOR SELECT
USING (
  auth.uid() = customer_id OR 
  shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Shop owners can update inquiries"
ON public.inquiries FOR UPDATE
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their inquiries"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inquiries 
    WHERE inquiries.id = messages.inquiry_id 
    AND (inquiries.customer_id = auth.uid() OR inquiries.shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM inquiries 
    WHERE inquiries.id = messages.inquiry_id 
    AND (inquiries.customer_id = auth.uid() OR inquiries.shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    ))
  )
);

-- Create shop_credits table
CREATE TABLE IF NOT EXISTS public.shop_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  reserved_credits INTEGER NOT NULL DEFAULT 0,
  lifetime_credits_purchased INTEGER NOT NULL DEFAULT 0,
  credits_expire_at TIMESTAMP WITH TIME ZONE,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  earned_from_shop_referrals INTEGER DEFAULT 0,
  earned_from_customer_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shop_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their credits"
ON public.shop_credits FOR SELECT
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their credits"
ON public.shop_credits FOR UPDATE
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(100),
  payment_transaction_id UUID,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their transactions"
ON public.credit_transactions FOR SELECT
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "Admins can view all transactions"
ON public.credit_transactions FOR SELECT
USING (is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON public.inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id ON public.inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_messages_inquiry_id ON public.messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_shop_credits_shop_id ON public.shop_credits(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_shop_id ON public.credit_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Add update triggers
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shop_credits_updated_at
  BEFORE UPDATE ON public.shop_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();