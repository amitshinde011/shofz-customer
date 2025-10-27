-- ============================================================================
-- ADMIN QUICK COMMANDS
-- ============================================================================
-- Quick reference SQL commands for admin user management
-- Copy and paste these commands as needed
-- ============================================================================

-- ============================================================================
-- 1. LIST ALL ADMIN USERS
-- ============================================================================

SELECT * FROM list_admin_users();

-- Alternative: Detailed view
SELECT
  u.id,
  u.full_name,
  u.email,
  u.phone_number,
  u.auth_id,
  ur.role,
  u.is_active,
  u.created_at,
  ur.granted_at,
  gb.full_name as granted_by
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN users gb ON gb.id = ur.granted_by
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.role DESC, u.created_at ASC;

-- ============================================================================
-- 2. CREATE NEW ADMIN USER
-- ============================================================================

-- Template: Update phone, email, and name
SELECT create_admin_user(
  p_phone_number := '+91XXXXXXXXXX',      -- CHANGE THIS
  p_email := 'admin@example.com',          -- CHANGE THIS
  p_full_name := 'Admin Name',             -- CHANGE THIS
  p_role := 'admin'                        -- or 'super_admin'
);

-- ============================================================================
-- 3. PROMOTE EXISTING USER TO ADMIN
-- ============================================================================

-- Step 1: Find user by phone or email
SELECT id, full_name, phone_number, email
FROM users
WHERE phone_number = '+91XXXXXXXXXX'
   OR email = 'user@example.com';

-- Step 2: Promote user (use ID from step 1)
SELECT promote_user_to_admin(
  p_user_id := 'PASTE-USER-ID-HERE',
  p_role := 'admin',
  p_granted_by := 'PASTE-SUPER-ADMIN-ID-HERE'  -- Optional
);

-- ============================================================================
-- 4. REVOKE ADMIN ACCESS
-- ============================================================================

SELECT revoke_admin_access(
  p_user_id := 'PASTE-USER-ID-HERE'
);

-- ============================================================================
-- 5. UPDATE ADMIN CREDENTIALS
-- ============================================================================

-- Update phone number
UPDATE users
SET phone_number = '+91XXXXXXXXXX',
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Update email
UPDATE users
SET email = 'newemail@example.com',
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Update name
UPDATE users
SET full_name = 'New Name',
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Update all at once
UPDATE users
SET
  phone_number = '+91XXXXXXXXXX',
  email = 'email@example.com',
  full_name = 'Full Name',
  updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- ============================================================================
-- 6. LINK TO SUPABASE AUTH
-- ============================================================================

-- Link user to Supabase Auth UUID
UPDATE users
SET auth_id = 'PASTE-SUPABASE-AUTH-UUID-HERE',
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Check auth linkage
SELECT
  id,
  full_name,
  phone_number,
  auth_id,
  CASE
    WHEN auth_id IS NULL THEN '❌ Not linked'
    ELSE '✅ Linked'
  END as auth_status
FROM users
WHERE id = 'PASTE-USER-ID-HERE';

-- ============================================================================
-- 7. VERIFY ADMIN ACCESS
-- ============================================================================

-- Check if user has admin role
SELECT is_admin('PASTE-USER-ID-HERE');
-- Returns: true (admin) or false (not admin)

-- List all roles for a user
SELECT
  u.full_name,
  ur.role,
  ur.granted_at,
  gb.full_name as granted_by
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN users gb ON gb.id = ur.granted_by
WHERE u.id = 'PASTE-USER-ID-HERE';

-- ============================================================================
-- 8. FIND USERS
-- ============================================================================

-- Find by phone
SELECT id, full_name, phone_number, email
FROM users
WHERE phone_number = '+91XXXXXXXXXX';

-- Find by email
SELECT id, full_name, phone_number, email
FROM users
WHERE email = 'user@example.com';

-- Find by name (case-insensitive)
SELECT id, full_name, phone_number, email
FROM users
WHERE full_name ILIKE '%search term%';

-- Find by ID
SELECT id, full_name, phone_number, email, auth_id
FROM users
WHERE id = 'PASTE-USER-ID-HERE';

-- ============================================================================
-- 9. CHANGE DEFAULT ADMIN CREDENTIALS (IMPORTANT!)
-- ============================================================================

-- Update Super Admin
UPDATE users
SET
  phone_number = '+91XXXXXXXXXX',  -- Your real phone
  email = 'your-email@domain.com', -- Your real email
  full_name = 'Your Real Name',
  updated_at = now()
WHERE phone_number = '+919999999999';  -- Default super admin phone

-- Update Regular Admin
UPDATE users
SET
  phone_number = '+91YYYYYYYYYY',
  email = 'admin@yourdomain.com',
  full_name = 'Admin Name',
  updated_at = now()
WHERE phone_number = '+919999999998';  -- Default admin phone

-- Update Support Admin
UPDATE users
SET
  phone_number = '+91ZZZZZZZZZZ',
  email = 'support@yourdomain.com',
  full_name = 'Support Name',
  updated_at = now()
WHERE phone_number = '+919999999997';  -- Default support admin phone

-- ============================================================================
-- 10. ACTIVATE/DEACTIVATE ADMIN USERS
-- ============================================================================

-- Deactivate admin (doesn't remove role, just disables login)
UPDATE users
SET is_active = false,
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Reactivate admin
UPDATE users
SET is_active = true,
    updated_at = now()
WHERE id = 'PASTE-USER-ID-HERE';

-- Check active status
SELECT id, full_name, is_active
FROM users
WHERE id = 'PASTE-USER-ID-HERE';

-- ============================================================================
-- 11. COUNT ADMIN USERS
-- ============================================================================

SELECT
  ur.role,
  COUNT(*) as total,
  COUNT(CASE WHEN u.is_active THEN 1 END) as active,
  COUNT(CASE WHEN NOT u.is_active THEN 1 END) as inactive
FROM user_roles ur
INNER JOIN users u ON u.id = ur.user_id
WHERE ur.role IN ('admin', 'super_admin')
GROUP BY ur.role
ORDER BY ur.role DESC;

-- ============================================================================
-- 12. CHECK ADMIN PERMISSIONS
-- ============================================================================

-- List RLS policies that use is_admin()
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%is_admin%'
ORDER BY tablename, policyname;

-- ============================================================================
-- 13. ADMIN ROLE HISTORY
-- ============================================================================

-- View when admin roles were granted
SELECT
  u.full_name as admin_user,
  ur.role,
  ur.granted_at,
  gb.full_name as granted_by,
  u.created_at as user_created_at
FROM user_roles ur
INNER JOIN users u ON u.id = ur.user_id
LEFT JOIN users gb ON gb.id = ur.granted_by
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.granted_at DESC;

-- ============================================================================
-- 14. CLEANUP/MAINTENANCE
-- ============================================================================

-- Find users with multiple admin roles (should be rare)
SELECT
  u.id,
  u.full_name,
  array_agg(ur.role) as roles,
  COUNT(*) as role_count
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
GROUP BY u.id, u.full_name
HAVING COUNT(*) > 1;

-- Remove duplicate roles (if any)
-- Manual: DELETE FROM user_roles WHERE id = 'PASTE-DUPLICATE-ROLE-ID';

-- Find inactive admin users (not logged in for 90+ days)
SELECT
  u.id,
  u.full_name,
  u.phone_number,
  u.last_login_at,
  ur.role,
  EXTRACT(DAY FROM (now() - u.last_login_at)) as days_since_login
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
  AND (u.last_login_at IS NULL OR u.last_login_at < now() - INTERVAL '90 days')
ORDER BY u.last_login_at ASC NULLS FIRST;

-- ============================================================================
-- 15. EMERGENCY ACCESS RESTORE
-- ============================================================================

-- If you lose admin access, create emergency admin:
SELECT create_admin_user(
  p_phone_number := '+91EMERGENCY',
  p_email := 'emergency@example.com',
  p_full_name := 'Emergency Admin',
  p_role := 'super_admin'
);

-- Then immediately:
-- 1. Login with emergency account
-- 2. Fix the original admin accounts
-- 3. Delete emergency account:
-- SELECT revoke_admin_access('emergency-admin-user-id');
-- DELETE FROM users WHERE phone_number = '+91EMERGENCY';

-- ============================================================================
-- 16. VERIFICATION CHECKLIST
-- ============================================================================

-- Run all these to verify setup:

-- 1. Count admins (should be 3 or more)
SELECT COUNT(*) as admin_count FROM user_roles WHERE role IN ('admin', 'super_admin');

-- 2. Check active admins (should match count above)
SELECT COUNT(*) as active_admin_count
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
  AND u.is_active = true;

-- 3. Check Supabase Auth links (should all be linked in production)
SELECT
  COUNT(*) as total_admins,
  COUNT(CASE WHEN u.auth_id IS NOT NULL THEN 1 END) as linked_to_auth,
  COUNT(CASE WHEN u.auth_id IS NULL THEN 1 END) as not_linked
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin');

-- 4. Verify is_admin function works
SELECT
  u.id,
  u.full_name,
  is_admin(u.id) as is_admin_result
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
LIMIT 1;
-- Should return: true

-- ============================================================================
-- NOTES
-- ============================================================================
/*

Remember to:
1. Change all default credentials (phone, email, name)
2. Link users to Supabase Auth (set auth_id)
3. Set strong passwords in Supabase Auth Dashboard
4. Enable MFA for all admin accounts
5. Keep credentials secure (use password manager)
6. Regularly audit admin user list
7. Remove inactive admin accounts
8. Document all admin account changes

For detailed documentation, see ADMIN_ONBOARDING_GUIDE.md

*/
