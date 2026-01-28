-- ============================================
-- Fix Row Level Security (RLS) Policies
-- This script enables proper RLS with Supabase auth.uid()
-- ============================================

-- Step 1: Add created_by columns if they don't exist
-- ============================================

-- Add created_by column to test_suites
ALTER TABLE test_suites 
ADD COLUMN IF NOT EXISTS created_by text;

-- Add created_by column to test_cases
ALTER TABLE test_cases 
ADD COLUMN IF NOT EXISTS created_by text;

-- Add created_by column to test_plans
ALTER TABLE test_plans 
ADD COLUMN IF NOT EXISTS created_by text;

-- Add created_by column to test_runs
ALTER TABLE test_runs 
ADD COLUMN IF NOT EXISTS created_by text;

-- Add created_by column to test_schedules
ALTER TABLE test_schedules 
ADD COLUMN IF NOT EXISTS created_by text;

-- Step 2: Enable RLS on all tables
-- ============================================

ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies using created_by column
-- ============================================

-- Test Suites Policies
CREATE POLICY "Users can insert own test suites" ON test_suites
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own test suites" ON test_suites
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can view own test suites" ON test_suites
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own test suites" ON test_suites
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- Test Cases Policies
CREATE POLICY "Users can insert own test cases" ON test_cases
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own test cases" ON test_cases
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can view own test cases" ON test_cases
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own test cases" ON test_cases
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- Test Plans Policies
CREATE POLICY "Users can insert own test plans" ON test_plans
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own test plans" ON test_plans
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can view own test plans" ON test_plans
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own test plans" ON test_plans
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- Test Runs Policies
CREATE POLICY "Users can insert own test runs" ON test_runs
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own test runs" ON test_runs
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can view own test runs" ON test_runs
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own test runs" ON test_runs
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- Test Schedules Policies
CREATE POLICY "Users can insert own schedules" ON test_schedules
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own schedules" ON test_schedules
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can view own schedules" ON test_schedules
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own schedules" ON test_schedules
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- ============================================
-- Migration Complete
-- ============================================

-- Now RLS is properly configured with Supabase auth.uid()
-- All tables use created_by column which matches Supabase Auth user ID
-- Users can only access and modify their own records
