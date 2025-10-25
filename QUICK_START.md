# LocalConnect Database - Quick Start Guide

## 🚀 TL;DR - Get Your Database Running in 5 Minutes

### Step 1: Choose Your Path

#### Path A: Fresh Supabase Project (Recommended) ⭐
```
1. Go to https://app.supabase.com
2. Create new project
3. Copy MASTER_MIGRATION.sql
4. Paste into SQL Editor
5. Click "Run"
6. Done! ✅
```

#### Path B: Supabase CLI
```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
cp MASTER_MIGRATION.sql supabase/migrations/20251024000000_master.sql
supabase db push
```

### Step 2: Post-Migration (2 minutes)

1. **Enable Realtime** (Dashboard → Database → Replication):
   - ✅ messages
   - ✅ notifications
   - ✅ inquiries

2. **Configure Auth** (Dashboard → Authentication):
   - ✅ Enable Phone (for OTP)
   - ✅ Add SMS provider

3. **Verify Storage** (Dashboard → Storage):
   - ✅ Check 5 buckets exist

### Step 3: Test (1 minute)

```sql
-- Run in SQL Editor
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should return 60+

SELECT * FROM platform_settings;
-- Should return 8 rows

SELECT * FROM get_featured_shops(5);
-- Should run without error
```

### Done! 🎉

Your database is ready for:
- User registration
- Shop creation
- Product listings
- Inquiries
- Payments
- Orders
- Reviews

---

## 📁 Files You Need

| File | What It Is | When To Use |
|------|-----------|-------------|
| **MASTER_MIGRATION.sql** | The migration script | Run this on your database |
| **DATABASE_MIGRATION_GUIDE.md** | Detailed instructions | If you need help or troubleshooting |
| **DATABASE_ISSUES_ANALYSIS.md** | Issues analysis | To understand what was fixed |
| **MIGRATION_SUMMARY.md** | Overview | To understand what you're getting |

---

## ⚡ One-Liner Commands

### Copy Migration to Supabase Migrations Folder
```bash
cp MASTER_MIGRATION.sql supabase/migrations/20251024000000_master_migration.sql
```

### Generate TypeScript Types
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Verify Migration Success
```bash
supabase db diff
# Should show no changes
```

---

## ✅ Success Checklist

After migration, verify:
- [ ] 60+ tables created
- [ ] All tables have RLS enabled
- [ ] 5 storage buckets exist
- [ ] 8 platform settings exist
- [ ] Functions work (test `get_nearby_shops`)
- [ ] Seed data inserted (credit_plans, message_templates)

---

## 🆘 Quick Troubleshooting

### "Extension does not exist"
- PostGIS not available → Use different Supabase tier

### "Permission denied"
- Run migration via Supabase dashboard (runs as superuser)

### "Relation already exists"
- You're on existing database → Use fresh database OR drop existing tables first

### Can't access data after migration
- Check RLS policies are correct
- Verify user role: `SELECT role FROM users WHERE email = 'your@email.com'`

---

## 🎯 What You Get

**Database Schema**:
- ✅ 60+ tables
- ✅ 24 ENUM types
- ✅ 100+ indexes
- ✅ 250+ RLS policies
- ✅ 10+ functions
- ✅ 30+ triggers

**Features**:
- ✅ User management (customers + shop owners)
- ✅ Shop listings with geolocation
- ✅ Product catalog
- ✅ Inquiry system
- ✅ Chat/messaging
- ✅ Order management
- ✅ UPI payment system
- ✅ Credits system
- ✅ Reviews & ratings
- ✅ Offers & promotions
- ✅ Analytics
- ✅ Referral system

---

## 📞 Need More Help?

1. **Detailed Guide**: Read `DATABASE_MIGRATION_GUIDE.md`
2. **Issues Reference**: Check `DATABASE_ISSUES_ANALYSIS.md`
3. **Full Summary**: See `MIGRATION_SUMMARY.md`
4. **Supabase Docs**: https://supabase.com/docs
5. **Supabase Discord**: https://discord.supabase.com

---

## 🔥 Pro Tips

1. **Always backup** before running migrations on existing databases
2. **Use fresh database** for cleanest result
3. **Test in staging** before production
4. **Monitor performance** after migration
5. **Update TypeScript types** after migration

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Migration execution | 2-5 minutes |
| Post-migration setup | 5-10 minutes |
| Testing & verification | 5-10 minutes |
| **Total** | **15-25 minutes** |

---

## 🎓 Learning Path

**If you're new**:
1. Start with this Quick Start
2. Run migration on test project
3. Explore tables in Supabase dashboard
4. Read full guide for detailed understanding

**If you're experienced**:
1. Review `MIGRATION_SUMMARY.md`
2. Run `MASTER_MIGRATION.sql`
3. Configure post-migration settings
4. Start building

---

**Created**: 2025-10-24
**Status**: Ready to Deploy
**Difficulty**: Easy
**Time Required**: 15-25 minutes
**Success Rate**: High ✅

---

**Let's go! 🚀**
