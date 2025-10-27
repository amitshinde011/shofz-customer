-- ============================================================================
-- INSERT ADMIN USER - Simple Queries
-- ============================================================================
-- Quick queries to manually insert an admin user into the database
-- ============================================================================

-- ============================================================================
-- OPTION 1: Insert New Admin User (Complete)
-- ============================================================================

-- Step 1: Insert user into users table
INSERT INTO users (
  id,
  phone_number,
  email,
  full_name,
  is_active,
  phone_verified,
  email_verified,
  profile_completed,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),                    -- Auto-generate UUID
  '+919876543210',                      -- CHANGE: Your phone number
  'admin@example.com',                  -- CHANGE: Your email
  'Admin User',                         -- CHANGE: Your name
  true,                                 -- Active
  true,                                 -- Phone verified
  true,                                 -- Email verified
  true,                                 -- Profile completed
  now(),
  now()
)
RETURNING id;  -- Copy this ID for next step

-- Step 2: Assign admin role (use ID from step 1)
INSERT INTO user_roles (
  id,
  user_id,
  role,
  granted_at
) VALUES (
  gen_random_uuid(),
  'PASTE-USER-ID-FROM-STEP-1-HERE',    -- CHANGE: Paste ID from step 1
  'admin',                              -- Role: 'admin' or 'super_admin'
  now()
);

-- ============================================================================
-- OPTION 2: Insert Admin User (One Query with Subquery)
-- ============================================================================

WITH new_user AS (
  INSERT INTO users (
    phone_number,
    email,
    full_name,
    is_active,
    phone_verified,
    email_verified,
    profile_completed,
    created_at,
    updated_at
  ) VALUES (
    '+919876543210',                    -- CHANGE: Your phone
    'admin@example.com',                -- CHANGE: Your email
    'Admin User',                       -- CHANGE: Your name
    true,
    true,
    true,
    true,
    now(),
    now()
  )
  RETURNING id
)
INSERT INTO user_roles (user_id, role, granted_at)
SELECT id, 'admin', now()              -- Role: 'admin' or 'super_admin'
FROM new_user;

-- ============================================================================
-- OPTION 3: Promote Existing User to Admin
-- ============================================================================

-- Step 1: Find user by phone or email
SELECT id, full_name, phone_number, email
FROM users
WHERE phone_number = '+919876543210'
   OR email = 'user@example.com';

-- Step 2: Insert admin role (use ID from step 1)
INSERT INTO user_roles (
  user_id,
  role,
  granted_at
) VALUES (
  'PASTE-USER-ID-HERE',                -- CHANGE: User ID from step 1
  'admin',                             -- Role: 'admin' or 'super_admin'
  now()
);

-- ============================================================================
-- OPTION 4: Insert Super Admin User
-- ============================================================================

WITH new_user AS (
  INSERT INTO users (
    phone_number,
    email,
    full_name,
    is_active,
    phone_verified,
    email_verified,
    profile_completed,
    created_at,
    updated_at
  ) VALUES (
    '+919999999999',                    -- CHANGE: Your phone
    'superadmin@example.com',           -- CHANGE: Your email
    'Super Administrator',              -- CHANGE: Your name
    true,
    true,
    true,
    true,
    now(),
    now()
  )
  RETURNING id
)
INSERT INTO user_roles (user_id, role, granted_at)
SELECT id, 'super_admin', now()        -- Super admin role
FROM new_user;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify user was created
SELECT id, full_name, phone_number, email, is_active
FROM users
WHERE phone_number = '+919876543210';  -- CHANGE: Your phone

-- Verify admin role was assigned
SELECT
  u.id,
  u.full_name,
  u.phone_number,
  ur.role,
  ur.granted_at
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE u.phone_number = '+919876543210'  -- CHANGE: Your phone
  AND ur.role IN ('admin', 'super_admin');

-- List all admin users
SELECT
  u.id,
  u.full_name,
  u.phone_number,
  u.email,
  ur.role,
  u.is_active
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.role DESC, u.created_at DESC;
