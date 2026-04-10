-- Add user-defined prefix code to test_suites
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Add auto-generated sequential ID to test_cases
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS custom_id VARCHAR(50);
