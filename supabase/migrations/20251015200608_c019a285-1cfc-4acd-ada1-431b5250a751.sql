-- Allow customers to update their own inquiries (e.g., mark as completed)
CREATE POLICY "Customers can update their own inquiries"
ON public.inquiries
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);