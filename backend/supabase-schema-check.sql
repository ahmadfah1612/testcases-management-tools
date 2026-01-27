-- Test query to verify schema setup
-- Run this in Supabase SQL Editor to check your database

-- 1. Check users table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if auth_id column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'auth_id';

-- 3. Check if role column exists
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'role';

-- 4. Check test_suites table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'test_suites' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. List all tables to verify they exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 6. Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- 7. Check triggers on auth.users
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' OR event_object_schema = 'auth';

-- 8. Sample query to check if we can insert
-- This will show you the structure without actually inserting
SELECT 
  id,
  username,
  email,
  role,
  auth_id,
  created_by
FROM users 
LIMIT 1;

-- 9. Check foreign key constraints on test_suites
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'test_suites';
