-- Allow shop owners to insert credit transactions for their own shops
CREATE POLICY "Shop owners can insert their transactions"
ON credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);