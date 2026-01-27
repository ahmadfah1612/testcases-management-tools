# Supabase Schema Setup Guide

## Quick Fix (If you encountered SQL error)

If you got an error when running `supabase-schema.sql`, follow these steps:

### Step 1: Run Base Schema
Go to **Supabase Dashboard → SQL Editor**, copy and run:
**File:** `backend/supabase-schema-base.sql`

This creates all tables, indexes, and basic triggers.

### Step 2: Run Fix Script (Only if database already exists)
If you already had tables created before, run:
**File:** `backend/supabase-schema-fix.sql`

This adds `auth_id` and `role` columns to the existing `users` table.

### Step 3: Sync Existing Users (IMPORTANT!)
If you already registered users before setting up the schema, run:
**File:** `backend/supabase-sync-users.sql`

This links your existing registered users to the custom users table using their email.

### Step 4: Enable RLS and Auth Triggers
Run:
**File:** `backend/supabase-schema-rls.sql`

This enables Row Level Security and creates triggers for automatic user creation.

## New vs Existing Databases

### New Database (Fresh Install)
If this is a fresh database without any tables:
1. Run `supabase-schema-base.sql`
2. Run `supabase-schema-rls.sql`
3. Done!

### Existing Database (Already Has Users Registered)
If you already registered users before setting up the schema:
1. Run `supabase-schema-base.sql`
2. Run `supabase-schema-fix.sql` (if tables already exist)
3. Run `supabase-sync-users.sql` (to link existing users)
4. Run `supabase-schema-rls.sql`
5. Done!

### Existing Database (Already Has Tables, No Users Yet)
If you already ran the schema and got an error:
1. Run `supabase-schema-fix.sql` to add missing columns
2. Run `supabase-schema-rls.sql` to enable RLS
3. Done!

## What Each File Does

### `supabase-schema-base.sql`
Creates:
- `users` table with auth_id support
- `test_suites` table
- `test_cases` table
- `test_case_versions` table
- `test_plans` table
- `test_plan_assignments` table
- `test_runs` table
- `test_results` table
- `test_schedules` table
- All indexes
- `updated_at` triggers

### `supabase-schema-fix.sql`
Adds to existing database:
- `auth_id` column (references Supabase auth.users)
- `role` column with admin/user constraint
- Makes `password_hash` nullable
- Indexes on `auth_id` and `role`

### `supabase-schema-rls.sql`
Enables:
- Row Level Security on users table
- Policies for user data access
- Auto-create user trigger on signup
- Helper functions for role management
- `user_profile` view combining auth and custom data

## After Setup

### Register First User
1. Go to `/register` in your app
2. Create an account
3. User is automatically created with default 'user' role

### Set Admin Role
To make a user admin, run this in Supabase SQL Editor:

```sql
UPDATE users 
SET role = 'admin' 
WHERE username = 'your-username';
```

Replace `your-username` with the username of the user you want to make admin.

## Verification

### Check Schema is Set Up Correctly

Run this query to verify:

```sql
-- Check users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (UUID)
- `username` (VARCHAR)
- `email` (VARCHAR)
- `password_hash` (TEXT, nullable)
- `role` (VARCHAR with constraint)
- `auth_id` (UUID)
- `created_at` (TIMESTAMP)

### Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

`rowsecurity` should be `true`.

### Check Trigger Exists

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

Should show one trigger on `auth.users`.

## Troubleshooting

### "role" Column Already Exists Error
If you get error that `role` column already exists:
- Your database is already updated
- Skip to Step 3 (RLS setup)
- Or use `supabase-schema-rls.sql` directly

### "auth_id" Column Already Exists Error
If you get error that `auth_id` column already exists:
- Your database is already updated
- Run only `supabase-schema-rls.sql`

### RLS Policy Already Exists
The `DROP POLICY IF EXISTS` handles this automatically - no action needed.

### User Not Created on Registration
If user signs up but record isn't created:
- Check trigger exists (see verification section)
- Check auth_id reference is correct
- Look at Supabase logs for trigger errors
