-- Add admin RLS policies for shops table
CREATE POLICY "Admins can view all shops"
ON public.shops
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update all shops"
ON public.shops
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can insert shops"
ON public.shops
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete shops"
ON public.shops
FOR DELETE
TO authenticated
USING (is_admin());

-- Add admin RLS policies for users table
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
TO authenticated
USING (is_admin());