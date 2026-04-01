-- ============================================================================
-- COMPLETE RLS FIX - Run this entire script in Supabase SQL Editor
-- ============================================================================
-- This fixes:
-- 1. Enables RLS on all tables
-- 2. Creates helper function to get current user ID as UUID
-- 3. Creates policies using UUID comparison (not text)
-- 4. Handles the auth.uid() -> users.id mapping correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on all tables
-- ============================================================================

DO $$
BEGIN
  -- Test Suites
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_suites' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_suites';
  END IF;

  -- Test Cases
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_cases' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_cases';
  END IF;

  -- Test Plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_plans' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_plans';
  END IF;

  -- Test Runs
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_runs' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_runs';
  END IF;

  -- Test Schedules
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_schedules' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_schedules';
  END IF;

  -- Test Results
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_results' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_results';
  END IF;

  -- Test Case Versions
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_case_versions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_case_versions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_case_versions';
  END IF;

  -- Test Plan Assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_plan_assignments' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE test_plan_assignments ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on test_plan_assignments';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create helper function to get current user ID as UUID
-- This converts auth.uid() (Supabase Auth ID) to users.id (our app user ID)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  current_auth_id UUID;
  current_user_id UUID;
BEGIN
  -- Get the auth.uid() which is the Supabase Auth user ID
  current_auth_id := auth.uid();
  
  -- Look up the corresponding users.id from the users table
  SELECT id INTO current_user_id
  FROM users
  WHERE auth_id = current_auth_id;
  
  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO service_role;

-- ============================================================================
-- STEP 3: Drop ALL existing policies to avoid conflicts
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN (
      'test_suites', 'test_cases', 'test_plans', 'test_runs', 
      'test_schedules', 'test_results', 'test_case_versions', 
      'test_plan_assignments'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Create new policies using UUID comparison
-- ============================================================================

-- ============================================
-- TEST SUITES POLICIES
-- ============================================
CREATE POLICY "test_suites_select_policy"
ON test_suites
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_suites_insert_policy"
ON test_suites
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_suites_update_policy"
ON test_suites
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_suites_delete_policy"
ON test_suites
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST CASES POLICIES
-- ============================================
CREATE POLICY "test_cases_select_policy"
ON test_cases
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_cases_insert_policy"
ON test_cases
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_cases_update_policy"
ON test_cases
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_cases_delete_policy"
ON test_cases
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST PLANS POLICIES
-- ============================================
CREATE POLICY "test_plans_select_policy"
ON test_plans
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_plans_insert_policy"
ON test_plans
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_plans_update_policy"
ON test_plans
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_plans_delete_policy"
ON test_plans
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST RUNS POLICIES
-- ============================================
CREATE POLICY "test_runs_select_policy"
ON test_runs
FOR SELECT
TO authenticated
USING (started_by = get_current_user_id());

CREATE POLICY "test_runs_insert_policy"
ON test_runs
FOR INSERT
TO authenticated
WITH CHECK (started_by = get_current_user_id());

CREATE POLICY "test_runs_update_policy"
ON test_runs
FOR UPDATE
TO authenticated
USING (started_by = get_current_user_id())
WITH CHECK (started_by = get_current_user_id());

CREATE POLICY "test_runs_delete_policy"
ON test_runs
FOR DELETE
TO authenticated
USING (started_by = get_current_user_id());

-- ============================================
-- TEST SCHEDULES POLICIES
-- ============================================
CREATE POLICY "test_schedules_select_policy"
ON test_schedules
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_schedules_insert_policy"
ON test_schedules
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_schedules_update_policy"
ON test_schedules
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_schedules_delete_policy"
ON test_schedules
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST RESULTS POLICIES
-- ============================================
CREATE POLICY "test_results_select_policy"
ON test_results
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_results_insert_policy"
ON test_results
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_results_update_policy"
ON test_results
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_results_delete_policy"
ON test_results
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST CASE VERSIONS POLICIES
-- ============================================
CREATE POLICY "test_case_versions_select_policy"
ON test_case_versions
FOR SELECT
TO authenticated
USING (created_by = get_current_user_id());

CREATE POLICY "test_case_versions_insert_policy"
ON test_case_versions
FOR INSERT
TO authenticated
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_case_versions_update_policy"
ON test_case_versions
FOR UPDATE
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "test_case_versions_delete_policy"
ON test_case_versions
FOR DELETE
TO authenticated
USING (created_by = get_current_user_id());

-- ============================================
-- TEST PLAN ASSIGNMENTS POLICIES
-- ============================================
-- For test_plan_assignments, we check through test_cases table
CREATE POLICY "test_plan_assignments_select_policy"
ON test_plan_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_cases tc
    WHERE tc.id = test_plan_assignments.test_case_id
    AND tc.created_by = get_current_user_id()
  )
);

CREATE POLICY "test_plan_assignments_insert_policy"
ON test_plan_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "test_plan_assignments_update_policy"
ON test_plan_assignments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "test_plan_assignments_delete_policy"
ON test_plan_assignments
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- STEP 5: Service Role Bypass (optional - uncomment if needed)
-- ============================================================================
-- The service_role automatically bypasses RLS, so no extra policies needed
-- But if you want to be explicit, you can add:

-- CREATE POLICY "service_role_all_access"
-- ON test_suites
-- FOR ALL
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

-- ============================================================================
-- STEP 6: Verify the fix
-- ============================================================================

SELECT 
  'RLS Status Check' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'test_suites', 'test_cases', 'test_plans', 
  'test_runs', 'test_schedules', 'test_results',
  'test_case_versions', 'test_plan_assignments'
)
ORDER BY tablename;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script has:
-- 1. Enabled RLS on all main tables
-- 2. Created get_current_user_id() helper function
-- 3. Dropped all old/conflicting policies
-- 4. Created new policies using UUID comparison
-- 5. Policies now correctly compare: created_by = get_current_user_id()
--
-- The key insight: 
-- - auth.uid() returns the Supabase Auth user ID (stored in users.auth_id)
-- - created_by stores users.id (our app's user ID)
-- - get_current_user_id() bridges this gap
-- ============================================================================
