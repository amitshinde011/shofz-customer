-- Add RLS policies for users table to allow inquiry queries to work

-- Allow anyone to view basic user profile information (needed for displaying customer info in inquiries)
CREATE POLICY "Anyone can view user profiles"
ON public.users
FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);