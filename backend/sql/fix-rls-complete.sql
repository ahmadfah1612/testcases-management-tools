-- ============================================================================
-- FIX RLS ISSUES - Run this in Supabase SQL Editor
-- ============================================================================
-- This script:
-- 1. Enables RLS on all tables
-- 2. Creates proper policies that work with UUID types
-- 3. Fixes the auth.uid() type mismatch
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on all tables
-- ============================================================================

ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plan_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop old policies if they exist (to avoid conflicts)
-- ============================================================================

-- Test Suites policies
DROP POLICY IF EXISTS "Users can insert own test suites" ON test_suites;
DROP POLICY IF EXISTS "Users can update own test suites" ON test_suites;
DROP POLICY IF EXISTS "Users can view own test suites" ON test_suites;
DROP POLICY IF EXISTS "Users can delete own test suites" ON test_suites;
DROP POLICY IF EXISTS "Users can view all test suites" ON test_suites;
DROP POLICY IF EXISTS "Users can manage own test suites" ON test_suites;

-- Test Cases policies
DROP POLICY IF EXISTS "Users can insert own test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can update own test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can view own test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can delete own test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can view all test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can manage own test cases" ON test_cases;

-- Test Plans policies
DROP POLICY IF EXISTS "Users can insert own test plans" ON test_plans;
DROP POLICY IF EXISTS "Users can update own test plans" ON test_plans;
DROP POLICY IF EXISTS "Users can view own test plans" ON test_plans;
DROP POLICY IF EXISTS "Users can delete own test plans" ON test_plans;
DROP POLICY IF EXISTS "Users can view all test plans" ON test_plans;
DROP POLICY IF EXISTS "Users can manage own test plans" ON test_plans;

-- Test Runs policies
DROP POLICY IF EXISTS "Users can insert own test runs" ON test_runs;
DROP POLICY IF EXISTS "Users can update own test runs" ON test_runs;
DROP POLICY IF EXISTS "Users can view own test runs" ON test_runs;
DROP POLICY IF EXISTS "Users can delete own test runs" ON test_runs;
DROP POLICY IF EXISTS "Users can view all test runs" ON test_runs;
DROP POLICY IF EXISTS "Users can manage own test runs" ON test_runs;

-- Test Schedules policies
DROP POLICY IF EXISTS "Users can insert own schedules" ON test_schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON test_schedules;
DROP POLICY IF EXISTS "Users can view own schedules" ON test_schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON test_schedules;
DROP POLICY IF EXISTS "Users can view all schedules" ON test_schedules;
DROP POLICY IF EXISTS "Users can manage own schedules" ON test_schedules;

-- Test Results policies
DROP POLICY IF EXISTS "Users can insert own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON test_results;
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON test_results;
DROP POLICY IF EXISTS "Users can view all test results" ON test_results;
DROP POLICY IF EXISTS "Users can manage own test results" ON test_results;

-- Test Case Versions policies
DROP POLICY IF EXISTS "Users can insert own test case versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can update own test case versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can view own test case versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can delete own test case versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can view all test case versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can manage own test case versions" ON test_case_versions;

-- Test Plan Assignments policies
DROP POLICY IF EXISTS "Users can insert own test plan assignments" ON test_plan_assignments;
DROP POLICY IF EXISTS "Users can update own test plan assignments" ON test_plan_assignments;
DROP POLICY IF EXISTS "Users can view own test plan assignments" ON test_plan_assignments;
DROP POLICY IF EXISTS "Users can delete own test plan assignments" ON test_plan_assignments;
DROP POLICY IF EXISTS "Users can view all test plan assignments" ON test_plan_assignments;
DROP POLICY IF EXISTS "Users can manage own test plan assignments" ON test_plan_assignments;

-- ============================================================================
-- STEP 3: Create helper function to get current user ID as UUID
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

-- ============================================================================
-- STEP 4: Create proper RLS policies using UUID comparison
-- ============================================================================

-- ============================================
-- TEST SUITES POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_suites
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST CASES POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_cases
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST PLANS POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_plans
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST RUNS POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on started_by"
ON test_runs
FOR ALL
TO authenticated
USING (started_by = get_current_user_id())
WITH CHECK (started_by = get_current_user_id());

-- ============================================
-- TEST SCHEDULES POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_schedules
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST RESULTS POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_results
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST CASE VERSIONS POLICIES
-- ============================================

CREATE POLICY "Enable all operations for users based on created_by"
ON test_case_versions
FOR ALL
TO authenticated
USING (created_by = get_current_user_id())
WITH CHECK (created_by = get_current_user_id());

-- ============================================
-- TEST PLAN ASSIGNMENTS POLICIES
-- ============================================

-- For test_plan_assignments, we need to check through the test_cases table
-- since test_plan_assignments doesn't have a direct created_by column
CREATE POLICY "Enable read for users based on test case ownership"
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

-- Allow insert/update/delete for authenticated users
CREATE POLICY "Enable insert for authenticated users"
ON test_plan_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON test_plan_assignments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON test_plan_assignments
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- STEP 5: Alternative approach - Service Role bypass (for backend API)
-- ============================================================================

-- If you're using the backend API with service role key, 
-- these policies allow the service role to bypass RLS

-- Note: Service role automatically bypasses RLS, so no extra policies needed

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check RLS status on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'test_suites', 'test_cases', 'test_plans', 
  'test_runs', 'test_results', 'test_schedules',
  'test_case_versions', 'test_plan_assignments'
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- 1. Enabled RLS on all tables
-- 2. Dropped conflicting old policies
-- 3. Created helper function get_current_user_id() to convert auth.uid() to users.id
-- 4. Created proper policies using UUID comparison
-- 5. Service role bypass works automatically
-- ============================================================================
