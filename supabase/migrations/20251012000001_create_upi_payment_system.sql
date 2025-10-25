-- UPI Payment System Tables
-- Comprehensive payment tracking with verification and dispute resolution

-- Payment requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 50 AND amount <= 100000),
  payment_method VARCHAR(50) DEFAULT 'UPI',

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (
    status IN (
      'initiated',
      'launched',
      'customer_claimed_success',
      'customer_claimed_failed',
      'shop_confirmed',
      'shop_rejected',
      'verified',
      'disputed',
      'refunded',
      'cancelled'
    )
  ),

  -- Customer confirmation
  customer_confirmation VARCHAR(20) CHECK (
    customer_confirmation IN ('success', 'failed', 'pending')
  ),
  customer_confirmed_at TIMESTAMPTZ,
  customer_screenshot_url TEXT,

  -- Shop confirmation
  shop_confirmation VARCHAR(20) CHECK (
    shop_confirmation IN ('received', 'not_received', 'pending')
  ),
  shop_confirmed_at TIMESTAMPTZ,
  shop_screenshot_url TEXT,

  -- Transaction details
  transaction_id VARCHAR(100),
  transaction_ref VARCHAR(100),
  upi_transaction_id VARCHAR(50),

  -- Verification
  verification_confidence INTEGER DEFAULT 0 CHECK (verification_confidence >= 0 AND verification_confidence <= 100),
  verification_evidence JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),

  -- Metadata
  payment_initiated_at TIMESTAMPTZ DEFAULT now(),
  payment_completed_at TIMESTAMPTZ,
  dispute_raised_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,

  -- Notes and comments
  customer_notes TEXT,
  shop_notes TEXT,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment verification evidence table
CREATE TABLE IF NOT EXISTS payment_verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  evidence_type VARCHAR(50) NOT NULL CHECK (
    evidence_type IN (
      'customer_confirmation',
      'shop_confirmation',
      'transaction_id',
      'screenshot',
      'bank_statement',
      'upi_notification',
      'admin_verification'
    )
  ),

  evidence_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  submitted_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment follow-ups table
CREATE TABLE IF NOT EXISTS payment_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  follow_up_type VARCHAR(50) NOT NULL CHECK (
    follow_up_type IN (
      'verification_reminder',
      'shop_confirmation_request',
      'dispute_investigation',
      'refund_process',
      'payment_timeout'
    )
  ),

  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'completed', 'cancelled')
  ),

  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  message_sent TEXT,
  response_received TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  raised_by UUID NOT NULL REFERENCES users(id),
  dispute_type VARCHAR(50) NOT NULL CHECK (
    dispute_type IN (
      'payment_not_received',
      'wrong_amount',
      'duplicate_payment',
      'unauthorized_payment',
      'other'
    )
  ),

  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  status VARCHAR(20) DEFAULT 'open' CHECK (
    status IN ('open', 'investigating', 'resolved', 'rejected', 'escalated')
  ),

  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_payment_requests_customer ON payment_requests(customer_id);
CREATE INDEX idx_payment_requests_shop ON payment_requests(shop_id);
CREATE INDEX idx_payment_requests_inquiry ON payment_requests(inquiry_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at DESC);
CREATE INDEX idx_payment_requests_customer_date ON payment_requests(customer_id, created_at DESC);

CREATE INDEX idx_payment_verification_evidence_payment ON payment_verification_evidence(payment_request_id);
CREATE INDEX idx_payment_follow_ups_payment ON payment_follow_ups(payment_request_id);
CREATE INDEX idx_payment_follow_ups_scheduled ON payment_follow_ups(scheduled_at);
CREATE INDEX idx_payment_disputes_payment ON payment_disputes(payment_request_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_follow_ups_updated_at BEFORE UPDATE ON payment_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

-- Payment requests policies
CREATE POLICY "Users can view their own payment requests"
  ON payment_requests FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() IN (
    SELECT owner_id FROM shops WHERE id = shop_id
  ));

CREATE POLICY "Customers can create payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers and shop owners can update payment requests"
  ON payment_requests FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() IN (
    SELECT owner_id FROM shops WHERE id = shop_id
  ));

-- Evidence policies
CREATE POLICY "Users can view evidence for their payments"
  ON payment_verification_evidence FOR SELECT
  USING (payment_request_id IN (
    SELECT id FROM payment_requests
    WHERE customer_id = auth.uid() OR shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  ));

CREATE POLICY "Users can submit evidence for their payments"
  ON payment_verification_evidence FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Follow-ups policies
CREATE POLICY "Users can view follow-ups for their payments"
  ON payment_follow_ups FOR SELECT
  USING (payment_request_id IN (
    SELECT id FROM payment_requests
    WHERE customer_id = auth.uid() OR shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  ));

-- Disputes policies
CREATE POLICY "Users can view disputes for their payments"
  ON payment_disputes FOR SELECT
  USING (payment_request_id IN (
    SELECT id FROM payment_requests
    WHERE customer_id = auth.uid() OR shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  ));

CREATE POLICY "Users can raise disputes for their payments"
  ON payment_disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

-- Function to get daily payment usage
CREATE OR REPLACE FUNCTION get_daily_payment_usage(user_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_amount DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) as transaction_count
  FROM payment_requests
  WHERE customer_id = user_id
    AND DATE(created_at) = target_date
    AND status IN ('customer_claimed_success', 'shop_confirmed', 'verified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user account age
CREATE OR REPLACE FUNCTION get_user_account_age_hours(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  age_hours NUMERIC;
BEGIN
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 INTO age_hours
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(age_hours, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE payment_requests IS 'Tracks all UPI payment requests with comprehensive verification';
COMMENT ON TABLE payment_verification_evidence IS 'Stores evidence for payment verification';
COMMENT ON TABLE payment_follow_ups IS 'Manages payment follow-up reminders and actions';
COMMENT ON TABLE payment_disputes IS 'Handles payment disputes and resolution';
