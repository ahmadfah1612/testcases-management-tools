-- Sync existing Supabase Auth users to custom users table
-- Run this if you already registered users before setting up the schema

-- First, create user records for any auth.users that don't have a custom record
INSERT INTO public.users (username, email, password_hash, role, auth_id)
SELECT
  -- Use email username part
  SPLIT_PART(a.email, '@', 1),
  a.email,
  NULL, -- password_hash is null
  'user', -- default role
  a.id -- reference to auth.users
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.auth_id = a.id
);

-- Update any existing users to link their auth_id
-- This handles users who registered before auth_id column was added
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE u.email = a.email
  AND u.auth_id IS NULL;

-- Return summary
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as users_with_auth_id,
  COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as users_without_auth_id
FROM public.users;
