# Admin User Onboarding Guide

## Quick Start

### 1. Run the Onboarding Script

```bash
psql -d your_database -f ADMIN_ONBOARDING.sql
```

This will create:
- 1 Super Admin user
- 1 Regular Admin user
- 1 Support Admin user
- Helper functions for admin management

### 2. Default Admin Accounts Created

| Role | Phone | Email | Name |
|------|-------|-------|------|
| Super Admin | +919999999999 | superadmin@localconnect.com | Super Administrator |
| Admin | +919999999998 | admin@localconnect.com | System Administrator |
| Support Admin | +919999999997 | support@localconnect.com | Support Administrator |

⚠️ **IMPORTANT**: Change these default credentials immediately!

---

## Admin Management Functions

### 1. Create New Admin User

```sql
-- Create a new admin
SELECT create_admin_user(
  p_phone_number := '+919876543210',
  p_email := 'admin@example.com',
  p_full_name := 'John Doe',
  p_role := 'admin'  -- or 'super_admin'
);
```

### 2. Promote Existing User to Admin

```sql
-- Find user ID first
SELECT id, full_name, phone_number FROM users WHERE phone_number = '+919876543210';

-- Promote user to admin
SELECT promote_user_to_admin(
  p_user_id := 'user-uuid-here',
  p_role := 'admin',
  p_granted_by := 'super-admin-uuid'
);
```

### 3. List All Admin Users

```sql
SELECT * FROM list_admin_users();
```

Output:
```
user_id | full_name | email | phone_number | role | is_active | granted_by_name | granted_at
```

### 4. Revoke Admin Access

```sql
SELECT revoke_admin_access(
  p_user_id := 'user-uuid-here',
  p_revoked_by := 'super-admin-uuid'
);
```

---

## Supabase Auth Integration

The script creates users in the database only. For full authentication, link them to Supabase Auth:

### Step 1: Create User in Supabase Auth

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter the same email/phone as database user
4. Set a strong password
5. Enable "Auto Confirm User" (or send verification email)
6. Copy the generated User UID

### Step 2: Link Database User to Auth

```sql
UPDATE users
SET auth_id = 'supabase-auth-uid-here'
WHERE phone_number = '+919999999999';
```

### Step 3: Test Login

1. Try logging in via your application
2. Verify admin user has access to admin features
3. Test `is_admin()` function returns true

---

## Changing Default Credentials

### Update Phone Number

```sql
UPDATE users
SET phone_number = '+91XXXXXXXXXX'
WHERE phone_number = '+919999999999';
```

### Update Email

```sql
UPDATE users
SET email = 'your-real-email@domain.com'
WHERE email = 'superadmin@localconnect.com';
```

### Update Name

```sql
UPDATE users
SET full_name = 'Your Real Name'
WHERE phone_number = '+919999999999';
```

---

## Verification Queries

### Check Admin Users Exist

```sql
SELECT
  u.id,
  u.full_name,
  u.email,
  u.phone_number,
  ur.role,
  u.is_active
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.role DESC;
```

### Verify is_admin() Function

```sql
-- Should return true for admin users
SELECT is_admin('admin-user-uuid-here');

-- Should return false for regular users
SELECT is_admin('customer-user-uuid-here');
```

### Check Auth Integration

```sql
SELECT
  u.id,
  u.full_name,
  u.auth_id,
  CASE
    WHEN u.auth_id IS NULL THEN 'Not linked to Supabase Auth'
    ELSE 'Linked to Supabase Auth'
  END as auth_status
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin');
```

---

## Security Best Practices

### 1. Strong Passwords
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Use password manager
- Change regularly

### 2. Multi-Factor Authentication (MFA)
Enable in Supabase Dashboard:
1. Go to Authentication → Providers
2. Enable "Phone" provider
3. Configure SMS settings
4. Require MFA for admin accounts

### 3. IP Whitelisting
Restrict admin access by IP:
```sql
-- Add to RLS policies if needed
CREATE POLICY "Admin access from trusted IPs only"
ON sensitive_table FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  AND current_setting('request.headers')::json->>'x-forwarded-for' = ANY(ARRAY['1.2.3.4', '5.6.7.8'])
);
```

### 4. Session Management
- Set short session timeouts for admins (1-2 hours)
- Force re-authentication for sensitive actions
- Log all admin activities

### 5. Principle of Least Privilege
- Use `admin` role for day-to-day operations
- Use `super_admin` only when necessary
- Create separate accounts for different admin functions

### 6. Audit Logging
Monitor admin actions:
```sql
-- Create audit log for admin actions
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  target_table VARCHAR(100),
  target_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Troubleshooting

### Issue: Admin user created but can't login

**Solution:**
1. Verify user exists in database: `SELECT * FROM users WHERE phone_number = '+919999999999';`
2. Verify role assigned: `SELECT * FROM user_roles WHERE user_id = 'user-uuid';`
3. Check if linked to Supabase Auth: `SELECT auth_id FROM users WHERE id = 'user-uuid';`
4. Verify user in Supabase Auth Dashboard
5. Check `is_active = true` in users table

### Issue: is_admin() returns false for admin user

**Solution:**
1. Verify role in user_roles table
2. Check function signature: `SELECT * FROM pg_proc WHERE proname = 'is_admin';`
3. Test function directly: `SELECT is_admin('user-uuid-here');`
4. Verify user_role ENUM includes 'admin' and 'super_admin'

### Issue: Can't update phone number (unique constraint)

**Solution:**
```sql
-- Check if phone number already in use
SELECT id, full_name, phone_number FROM users WHERE phone_number = '+91XXXXXXXXXX';

-- If duplicate exists, update one of them
UPDATE users SET phone_number = '+91YYYYYYYYYY' WHERE id = 'duplicate-user-uuid';
```

### Issue: Function create_admin_user doesn't exist

**Solution:**
Run the ADMIN_ONBOARDING.sql script again. It's idempotent and safe to re-run.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Backup database
- [ ] Run ADMIN_ONBOARDING.sql in production
- [ ] Change all default phone numbers
- [ ] Change all default email addresses
- [ ] Update full names to real names
- [ ] Create users in Supabase Auth
- [ ] Link auth_id for all admin users
- [ ] Test admin login works
- [ ] Test admin can access restricted features
- [ ] Enable MFA for all admin accounts
- [ ] Set up monitoring/alerting for admin activities
- [ ] Document credentials in secure vault (1Password, LastPass, etc.)
- [ ] Create backup super_admin account
- [ ] Test admin role revocation works
- [ ] Test promote_user_to_admin works
- [ ] Set up regular admin user audit
- [ ] Configure session timeout policies
- [ ] Test RLS policies allow admin access
- [ ] Remove test/demo admin accounts if any

---

## Quick Reference Commands

```sql
-- List all admins
SELECT * FROM list_admin_users();

-- Create new admin
SELECT create_admin_user('+91XXXXXXXXXX', 'email@example.com', 'Name', 'admin');

-- Promote user
SELECT promote_user_to_admin('user-uuid', 'admin', 'granted-by-uuid');

-- Revoke admin
SELECT revoke_admin_access('user-uuid');

-- Check if user is admin
SELECT is_admin('user-uuid');

-- Update credentials
UPDATE users SET phone_number = '+91XXXXXXXXXX' WHERE id = 'user-uuid';

-- Link to Supabase Auth
UPDATE users SET auth_id = 'supabase-uuid' WHERE id = 'user-uuid';
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review ADMIN_ONBOARDING.sql comments
3. Verify database schema with MASTER_MIGRATION.sql
4. Check Supabase Auth documentation: https://supabase.com/docs/guides/auth

---

## Version History

- **v1.0.0** (2025-10-26) - Initial admin onboarding script
  - Created 3 default admin users
  - Added helper functions for admin management
  - Included security best practices
  - Added Supabase Auth integration guide
