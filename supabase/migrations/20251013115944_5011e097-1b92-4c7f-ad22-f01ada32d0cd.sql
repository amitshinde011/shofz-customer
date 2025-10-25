-- Add missing customer_id foreign key constraint to inquiries table
-- This is required for PostgREST to perform API joins with users table

ALTER TABLE public.inquiries
ADD CONSTRAINT inquiries_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;