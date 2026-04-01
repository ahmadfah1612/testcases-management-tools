-- ============================================================================
-- DIAGNOSTIC SCRIPT - Run this in Supabase SQL Editor to find issues
-- ============================================================================

-- ============================================================================
-- TEST 1: Check if RLS is enabled on all tables
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'test_suites', 'test_cases', 'test_plans', 
  'test_runs', 'test_results', 'test_schedules',
  'test_case_versions', 'test_plan_assignments'
)
ORDER BY tablename;

-- ============================================================================
-- TEST 2: Check if policies exist for each table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 3: Check data types of created_by columns
-- ============================================================================
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('created_by', 'started_by', 'auth_id')
ORDER BY table_name, column_name;

-- ============================================================================
-- TEST 4: Check users table structure and sample data
-- ============================================================================
-- Count users
SELECT 'Total users' as check_type, COUNT(*)::text as result FROM users
UNION ALL
SELECT 'Users with auth_id', COUNT(*)::text FROM users WHERE auth_id IS NOT NULL
UNION ALL
SELECT 'Users without auth_id', COUNT(*)::text FROM users WHERE auth_id IS NULL;

-- Sample user data (limited)
SELECT 
  id,
  username,
  email,
  role,
  auth_id,
  LEFT(auth_id::text, 20) || '...' as auth_id_preview
FROM users
LIMIT 5;

-- ============================================================================
-- TEST 5: Check test data existence
-- ============================================================================
SELECT 'test_suites' as table_name, COUNT(*) as row_count FROM test_suites
UNION ALL
SELECT 'test_cases', COUNT(*) FROM test_cases
UNION ALL
SELECT 'test_plans', COUNT(*) FROM test_plans
UNION ALL
SELECT 'test_runs', COUNT(*) FROM test_runs
UNION ALL
SELECT 'test_results', COUNT(*) FROM test_results
UNION ALL
SELECT 'test_schedules', COUNT(*) FROM test_schedules;

-- ============================================================================
-- TEST 6: Check if test_suites have correct created_by format
-- ============================================================================
SELECT 
  created_by,
  pg_typeof(created_by) as column_type,
  CASE 
    WHEN created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN '✓ Valid UUID format'
    ELSE '✗ Invalid UUID format'
  END as uuid_check,
  COUNT(*) as count
FROM test_suites
GROUP BY created_by
LIMIT 10;

-- ============================================================================
-- TEST 7: Simulate what happens with auth.uid()
-- ============================================================================
-- This shows what auth.uid() returns and if it matches users.id
SELECT 
  'Current auth.uid() would return the Supabase Auth user ID' as description,
  'Users table uses auth_id column to link to Supabase Auth' as note,
  'Users.id is a separate UUID used in created_by columns' as note2;

-- Check auth_id vs id mapping
SELECT 
  id as users_id,
  auth_id,
  CASE WHEN id = auth_id THEN 'IDs are the same' ELSE 'IDs are different' END as comparison
FROM users
WHERE auth_id IS NOT NULL
LIMIT 5;

-- ============================================================================
-- TEST 8: Check for RLS violations in existing data
-- ============================================================================
-- Find test_suites where created_by doesn't match any users.id
SELECT 
  'orphaned_test_suites' as issue_type,
  COUNT(*) as count
FROM test_suites ts
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = ts.created_by
)
UNION ALL
-- Find test_cases where created_by doesn't match any users.id
SELECT 
  'orphaned_test_cases',
  COUNT(*)
FROM test_cases tc
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = tc.created_by
);

-- ============================================================================
-- TEST 9: Check if the get_current_user_id function exists and works
-- ============================================================================
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_current_user_id';

-- ============================================================================
-- TEST 10: Try to understand the data flow
-- ============================================================================
SELECT 
  'Expected flow:' as step,
  '1. Frontend login → Supabase Auth creates session' as description
UNION ALL
SELECT '2', 'Frontend uses access_token to call backend API'
UNION ALL
SELECT '3', 'Backend auth middleware validates token with Supabase'
UNION ALL
SELECT '4', 'Backend gets auth.uid() (Supabase Auth user ID)'
UNION ALL
SELECT '5', 'Backend looks up users.id using auth_id = auth.uid()'
UNION ALL
SELECT '6', 'Backend queries tables using users.id in created_by'
UNION ALL
SELECT '7', 'RLS policies check: created_by = get_current_user_id()'
UNION ALL
SELECT '8', 'Data is returned if RLS passes';

-- ============================================================================
-- SUMMARY RECOMMENDATIONS
-- ============================================================================
SELECT 
  'RECOMMENDATIONS' as section,
  'Run these fixes if tests above show issues:' as description;
