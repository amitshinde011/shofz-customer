-- Create enums for support system
CREATE TYPE support_ticket_category AS ENUM (
  'payment_issues',
  'technical_issues', 
  'account_verification',
  'refunds_disputes',
  'general_inquiry',
  'shop_management',
  'product_issues'
);

CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TYPE contact_request_status AS ENUM ('new', 'in_progress', 'responded', 'closed');

-- Create support_tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  subject VARCHAR NOT NULL,
  description TEXT NOT NULL,
  category support_ticket_category NOT NULL,
  priority support_ticket_priority DEFAULT 'medium',
  status support_ticket_status DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support_messages table
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contact_requests table
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  subject VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status contact_request_status DEFAULT 'new',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support_ticket_tags table
CREATE TABLE support_ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  tag VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticket_id, tag)
);

-- Create indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_shop_id ON support_tickets(shop_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_contact_requests_status ON contact_requests(status);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Admins can view all tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view their own tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Shop owners can view shop tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create tickets"
ON support_tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets"
ON support_tickets FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete tickets"
ON support_tickets FOR DELETE
TO authenticated
USING (is_admin());

-- RLS Policies for support_messages
CREATE POLICY "Admins can view all messages"
ON support_messages FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view messages for their tickets"
ON support_messages FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  ) AND (NOT is_internal_note OR is_admin())
);

CREATE POLICY "Shop owners can view messages for shop tickets"
ON support_messages FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  ) AND (NOT is_internal_note OR is_admin())
);

CREATE POLICY "Admins can create messages"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Users can send messages to their tickets"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  ) AND
  is_internal_note = false
);

-- RLS Policies for contact_requests
CREATE POLICY "Anyone can create contact requests"
ON contact_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all contact requests"
ON contact_requests FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update contact requests"
ON contact_requests FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete contact requests"
ON contact_requests FOR DELETE
TO authenticated
USING (is_admin());

-- RLS Policies for support_ticket_tags
CREATE POLICY "Admins can manage tags"
ON support_ticket_tags FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view tags on their tickets"
ON support_ticket_tags FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  )
);

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS (SELECT 1 FROM support_tickets WHERE ticket_number = NEW.ticket_number) LOOP
    NEW.ticket_number := 'TKT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contact_requests_updated_at
BEFORE UPDATE ON contact_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE contact_requests;