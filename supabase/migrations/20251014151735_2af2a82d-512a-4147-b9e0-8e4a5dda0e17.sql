-- Add RLS policy for customers to view their own referral transactions
CREATE POLICY "Customers can view their own referral transactions"
ON referral_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = referred_customer_id);