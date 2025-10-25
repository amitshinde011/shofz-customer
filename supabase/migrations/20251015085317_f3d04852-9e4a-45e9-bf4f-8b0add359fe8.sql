-- Add default user password setting to platform_settings
INSERT INTO platform_settings (key, value, category, description)
VALUES (
  'default_user_password',
  '"bshofz011"',
  'security',
  'Default password assigned to newly created users. Users should change this upon first login.'
)
ON CONFLICT (key) DO NOTHING;