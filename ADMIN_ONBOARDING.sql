-- ============================================================================
-- ADMIN USER ONBOARDING SCRIPT
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-10-26
-- Description: Creates admin users in the LocalConnect marketplace database
--
-- IMPORTANT NOTES:
-- 1. This script creates users directly in the database for testing/setup
-- 2. In production, you should use Supabase Auth to create users first
-- 3. Update the phone numbers, emails, and passwords as needed
-- 4. Keep credentials secure - change default passwords immediately
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE ADMIN USER FUNCTION
-- ============================================================================

-- Helper function to create admin users
CREATE OR REPLACE FUNCTION create_admin_user(
  p_phone_number VARCHAR(20),
  p_email VARCHAR(255) DEFAULT NULL,
  p_full_name VARCHAR(255) DEFAULT 'Admin User',
  p_role user_role DEFAULT 'admin',
  p_granted_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_user UUID;
BEGIN
  -- Check if user already exists by phone or email
  SELECT id INTO v_existing_user
  FROM users
  WHERE phone_number = p_phone_number
     OR (p_email IS NOT NULL AND email = p_email)
  LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    RAISE NOTICE 'User already exists with ID: %. Updating role to %.', v_existing_user, p_role;

    -- Update existing user to admin
    UPDATE users
    SET
      full_name = COALESCE(p_full_name, full_name),
      email = COALESCE(p_email, email),
      is_active = true,
      updated_at = now()
    WHERE id = v_existing_user;

    -- Add or update admin role
    INSERT INTO user_roles (user_id, role, granted_by, granted_at)
    VALUES (v_existing_user, p_role, p_granted_by, now())
    ON CONFLICT (user_id, role)
    DO UPDATE SET granted_at = now(), granted_by = EXCLUDED.granted_by;

    RETURN v_existing_user;
  END IF;

  -- Create new user
  INSERT INTO users (
    phone_number,
    email,
    full_name,
    is_active,
    email_verified,
    phone_verified,
    profile_completed,
    created_at,
    updated_at
  )
  VALUES (
    p_phone_number,
    p_email,
    p_full_name,
    true,
    CASE WHEN p_email IS NOT NULL THEN true ELSE false END,
    true,  -- Phone is verified for admin
    true,  -- Profile is complete
    now(),
    now()
  )
  RETURNING id INTO v_user_id;

  -- Add admin role
  INSERT INTO user_roles (user_id, role, granted_by, granted_at)
  VALUES (v_user_id, p_role, p_granted_by, now());

  RAISE NOTICE 'Created new % user with ID: %', p_role, v_user_id;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION create_admin_user IS 'Creates or updates a user with admin/super_admin role';

-- ============================================================================
-- SECTION 2: CREATE DEFAULT ADMIN USERS
-- ============================================================================

DO $$
DECLARE
  v_super_admin_id UUID;
  v_admin_id UUID;
BEGIN
  RAISE NOTICE '=== Creating Admin Users ===';

  -- Create Super Admin (has full system access)
  SELECT create_admin_user(
    p_phone_number := '+919999999999',
    p_email := 'superadmin@localconnect.com',
    p_full_name := 'Super Administrator',
    p_role := 'super_admin'
  ) INTO v_super_admin_id;

  RAISE NOTICE 'Super Admin created with ID: %', v_super_admin_id;

  -- Create Regular Admin (granted by super admin)
  SELECT create_admin_user(
    p_phone_number := '+919999999998',
    p_email := 'admin@localconnect.com',
    p_full_name := 'System Administrator',
    p_role := 'admin',
    p_granted_by := v_super_admin_id
  ) INTO v_admin_id;

  RAISE NOTICE 'Admin created with ID: %', v_admin_id;

  -- Create Support Admin
  SELECT create_admin_user(
    p_phone_number := '+919999999997',
    p_email := 'support@localconnect.com',
    p_full_name := 'Support Administrator',
    p_role := 'admin',
    p_granted_by := v_super_admin_id
  ) INTO v_admin_id;

  RAISE NOTICE 'Support Admin created with ID: %', v_admin_id;

END $$;

-- ============================================================================
-- SECTION 3: VERIFY ADMIN USERS
-- ============================================================================

-- Display created admin users
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Admin Users Summary ===';
  RAISE NOTICE '';

  FOR rec IN
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone_number,
      ur.role,
      ur.granted_at,
      (SELECT full_name FROM users WHERE id = ur.granted_by) as granted_by_name
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.role IN ('admin', 'super_admin')
    ORDER BY ur.role DESC, ur.granted_at ASC
  LOOP
    RAISE NOTICE 'ID: %', rec.id;
    RAISE NOTICE 'Name: %', rec.full_name;
    RAISE NOTICE 'Email: %', COALESCE(rec.email, 'N/A');
    RAISE NOTICE 'Phone: %', rec.phone_number;
    RAISE NOTICE 'Role: %', rec.role;
    RAISE NOTICE 'Granted At: %', rec.granted_at;
    RAISE NOTICE 'Granted By: %', COALESCE(rec.granted_by_name, 'Self/System');
    RAISE NOTICE '---';
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total Admin Users: %', (
    SELECT COUNT(*) FROM user_roles WHERE role IN ('admin', 'super_admin')
  );
END $$;

-- ============================================================================
-- SECTION 4: CREATE ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- Function to promote existing user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(
  p_user_id UUID,
  p_role user_role DEFAULT 'admin',
  p_granted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid admin role: %. Must be admin or super_admin', p_role;
  END IF;

  -- Add admin role
  INSERT INTO user_roles (user_id, role, granted_by, granted_at)
  VALUES (p_user_id, p_role, p_granted_by, now())
  ON CONFLICT (user_id, role)
  DO UPDATE SET granted_at = now(), granted_by = EXCLUDED.granted_by;

  -- Ensure user is active
  UPDATE users
  SET is_active = true, updated_at = now()
  WHERE id = p_user_id;

  RAISE NOTICE 'User % promoted to %', p_user_id, p_role;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION promote_user_to_admin IS 'Promotes an existing user to admin or super_admin role';

-- Function to revoke admin access
CREATE OR REPLACE FUNCTION revoke_admin_access(
  p_user_id UUID,
  p_revoked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roles_removed INTEGER;
BEGIN
  -- Remove admin roles
  DELETE FROM user_roles
  WHERE user_id = p_user_id
    AND role IN ('admin', 'super_admin');

  GET DIAGNOSTICS v_roles_removed = ROW_COUNT;

  IF v_roles_removed > 0 THEN
    RAISE NOTICE 'Removed % admin role(s) from user %', v_roles_removed, p_user_id;
    RETURN true;
  ELSE
    RAISE NOTICE 'User % did not have any admin roles', p_user_id;
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION revoke_admin_access IS 'Removes all admin roles from a user';

-- Function to list all admins
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  user_id UUID,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  role user_role,
  is_active BOOLEAN,
  granted_by_name VARCHAR(255),
  granted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone_number,
    ur.role,
    u.is_active,
    gb.full_name as granted_by_name,
    ur.granted_at
  FROM users u
  INNER JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN users gb ON gb.id = ur.granted_by
  WHERE ur.role IN ('admin', 'super_admin')
  ORDER BY ur.role DESC, ur.granted_at ASC;
END;
$$;

COMMENT ON FUNCTION list_admin_users IS 'Returns a list of all admin and super_admin users';

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
/*

-- Create a new admin user
SELECT create_admin_user(
  p_phone_number := '+919876543210',
  p_email := 'newadmin@example.com',
  p_full_name := 'New Admin User',
  p_role := 'admin'
);

-- Promote existing user to admin
SELECT promote_user_to_admin(
  p_user_id := '12345678-1234-1234-1234-123456789abc',
  p_role := 'admin',
  p_granted_by := 'super-admin-user-id'
);

-- List all admin users
SELECT * FROM list_admin_users();

-- Revoke admin access
SELECT revoke_admin_access(
  p_user_id := '12345678-1234-1234-1234-123456789abc'
);

-- Update default admin credentials (IMPORTANT: Do this in production!)
UPDATE users
SET
  phone_number = '+91XXXXXXXXXX',  -- Your phone
  email = 'your-email@domain.com',  -- Your email
  full_name = 'Your Name'
WHERE phone_number = '+919999999999';  -- Super admin

*/

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
/*

IMPORTANT SECURITY CONSIDERATIONS:

1. **Change Default Credentials**
   - Update phone numbers and emails immediately after running this script
   - The default credentials are for initial setup only

2. **Supabase Auth Integration**
   - In production, create users via Supabase Auth first
   - Then link them using the auth_id field
   - Use: UPDATE users SET auth_id = 'supabase-auth-uuid' WHERE id = 'user-uuid';

3. **Password Setup**
   - This script does NOT set passwords
   - Passwords are managed by Supabase Auth
   - After creating users here, register them in Supabase Auth Dashboard

4. **Super Admin Protection**
   - Never delete the super_admin user
   - Keep super_admin credentials highly secure
   - Use admin role for day-to-day operations

5. **Audit Trail**
   - All role grants are tracked with granted_by and granted_at
   - Monitor the user_roles table for unauthorized changes
   - Consider adding audit logging for admin actions

6. **Row Level Security**
   - Admin users can bypass most RLS policies via is_admin() function
   - Be careful when granting admin access
   - Regularly review admin user list

7. **Testing vs Production**
   - Use different credentials for testing and production
   - Never commit production credentials to version control
   - Store credentials in secure environment variables

*/

-- ============================================================================
-- POST-DEPLOYMENT CHECKLIST
-- ============================================================================
/*

After running this script:

[ ] Verify admin users were created: SELECT * FROM list_admin_users();
[ ] Update phone numbers to real values
[ ] Update email addresses to real values
[ ] Register users in Supabase Auth Dashboard
[ ] Link auth_id to Supabase Auth UUIDs
[ ] Test admin login via application
[ ] Test is_admin() function works correctly
[ ] Verify admin can access restricted features
[ ] Document admin credentials securely
[ ] Set up MFA for admin accounts (via Supabase)
[ ] Create backup admin account
[ ] Test admin role assignment/revocation
[ ] Set up monitoring for admin activities

*/
