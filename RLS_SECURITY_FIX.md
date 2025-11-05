# Security Fix: Enable Row Level Security

## Critical Action Required

**Run this SQL in your Supabase SQL Editor immediately:**

```sql
-- Enable Row Level Security on tables that have policies but RLS disabled
-- This fixes a critical security vulnerability

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## Why This is Critical

These 8 tables have RLS policies defined but RLS is not enabled on the tables themselves. This means:
- **All data in these tables is publicly accessible** 
- RLS policies are being ignored completely
- Any user can read/write/delete data in these tables

## How to Apply

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the SQL above
4. Run the query
5. Verify RLS is enabled by checking the table settings

## Verification

After running the SQL, verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'activity_feed', 
  'audit_logs', 
  'message_templates', 
  'payouts', 
  'platform_alerts', 
  'platform_settings', 
  'shop_subscriptions', 
  'transactions'
);
```

All tables should show `rowsecurity = true`.
