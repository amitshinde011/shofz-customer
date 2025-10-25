-- Grant admin role to amitshinde011@gmail.com
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('e39cf5b0-9d71-4cff-844b-f86a62485804', 'admin', true)
ON CONFLICT (user_id, role) DO UPDATE 
SET is_active = true;