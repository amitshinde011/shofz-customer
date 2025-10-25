-- Allow shop owners to insert credit transactions for their own shops
CREATE POLICY "Shop owners can insert their credit transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (
  shop_id IN (
    SELECT id 
    FROM public.shops 
    WHERE owner_id = auth.uid()
  )
);