-- ============================================================================
-- COMPLETE CONSOLIDATED MIGRATION FOR SUPABASE
-- Date: 2026-01-28
-- Description: Full schema setup with RLS, auth triggers, and all latest changes
-- Usage: Run this in Supabase SQL Editor or via psql
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS AND BASE TABLES
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Custom user data - Supabase Auth handles auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Suites table
CREATE TABLE IF NOT EXISTS test_suites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_result TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  tags JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Case Versions table
CREATE TABLE IF NOT EXISTS test_case_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  changes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_case_id, version)
);

-- Test Plans table
CREATE TABLE IF NOT EXISTS test_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  test_case_ids TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Plan Assignments table
CREATE TABLE IF NOT EXISTS test_plan_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  UNIQUE(test_case_id, plan_id)
);

-- Test Runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_plan_id UUID NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'RUNNING',
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Test Results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'SKIP',
  actual_result TEXT,
  screenshots TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Schedules table
CREATE TABLE IF NOT EXISTS test_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_plan_id UUID NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECTION 2: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_test_suites_created_by ON test_suites(created_by);
CREATE INDEX IF NOT EXISTS idx_test_suites_parent_id ON test_suites(parent_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite_id ON test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX IF NOT EXISTS idx_test_plans_created_by ON test_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_test_runs_test_plan_id ON test_runs(test_plan_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_by ON test_runs(started_by);
CREATE INDEX IF NOT EXISTS idx_test_results_test_run_id ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_case_id ON test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_schedules_test_plan_id ON test_schedules(test_plan_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- ============================================================================
-- SECTION 3: TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_test_suites_updated_at ON test_suites;
CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_cases_updated_at ON test_cases;
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_plans_updated_at ON test_plans;
CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Allow public view users" ON users;
CREATE POLICY "Allow public view users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert own user" ON users;
CREATE POLICY "Allow insert own user" ON users FOR INSERT 
  WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Allow view own user" ON users;
CREATE POLICY "Allow view own user" ON users FOR SELECT 
  USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Allow update own user" ON users;
CREATE POLICY "Allow update own user" ON users FOR UPDATE 
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id AND role = (SELECT role FROM users WHERE id = users.id));

DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
CREATE POLICY "Allow admins to delete users" ON users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 5: AUTH TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Trigger to automatically create user record when Supabase Auth user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create a record in custom users table
  INSERT INTO public.users (username, email, password_hash, role, auth_id)
  VALUES (
    -- Use email as username initially (extract from email)
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email,
    NULL, -- password_hash is null since Supabase handles it
    'user', -- default role
    NEW.id -- reference to auth.users
  )
  RETURNING id INTO new_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user role (admin only)
DROP FUNCTION IF EXISTS set_user_role(UUID, VARCHAR) CASCADE;

CREATE OR REPLACE FUNCTION set_user_role(target_user_id UUID, new_role VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  UPDATE users SET role = new_role WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_role(UUID, VARCHAR) TO authenticated;

-- Function to check if user is admin
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================

-- Create a view to combine auth and custom user data
DROP VIEW IF EXISTS user_profile CASCADE;
CREATE OR REPLACE VIEW user_profile AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.created_at,
  u.auth_id,
  a.email AS auth_email,
  a.email_confirmed_at,
  a.last_sign_in_at,
  a.created_at AS auth_created_at
FROM users u
LEFT JOIN auth.users a ON u.auth_id = a.id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- 1. Created all base tables with UUID primary keys
-- 2. Added indexes for performance optimization
-- 3. Created triggers for automatic updated_at timestamps
-- 4. Enabled Row Level Security (RLS) on users table
-- 5. Created policies for user management
-- 6. Added auth trigger to auto-create user records on signup
-- 7. Added helper functions for admin operations
-- 8. Created user_profile view for combined user data
-- 9. Changed steps and tags columns to JSONB for better querying
-- 10. Added role column with admin/user check constraint
-- 11. Added auth_id column to link with Supabase Auth
-- ============================================================================
