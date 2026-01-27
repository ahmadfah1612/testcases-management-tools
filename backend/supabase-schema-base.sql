-- Base Schema (Run this first)
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Note: Supabase Auth handles auth.users, this is for our app-specific user data)
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
  steps TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  tags TEXT,
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

-- Create indexes for better performance
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

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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
