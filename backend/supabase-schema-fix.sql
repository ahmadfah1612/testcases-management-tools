-- Fix existing database schema to support hybrid auth
-- Run this if you already have the schema set up and just need to add auth_id

-- Add auth_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add role column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        ALTER TABLE users ADD CONSTRAINT check_role CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Update password_hash to allow NULL (since Supabase will handle passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create index on auth_id for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Note: After running this, also run supabase-schema-rls.sql to enable RLS and triggers
