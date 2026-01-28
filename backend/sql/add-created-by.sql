-- Add created_by column to test_suites if it doesn't exist
ALTER TABLE test_suites 
ADD COLUMN IF NOT EXISTS created_by text REFERENCES auth.users(id);

-- Add created_by column to test_cases if it doesn't exist
ALTER TABLE test_cases 
ADD COLUMN IF NOT EXISTS created_by text REFERENCES auth.users(id);

-- Add created_by column to test_plans if it doesn't exist
ALTER TABLE test_plans 
ADD COLUMN IF NOT EXISTS created_by text REFERENCES auth.users(id);

-- Add created_by column to test_runs if it doesn't exist
ALTER TABLE test_runs 
ADD COLUMN IF NOT EXISTS created_by text REFERENCES auth.users(id);

-- Add created_by column to test_schedules if it doesn't exist
ALTER TABLE test_schedules 
ADD COLUMN IF NOT EXISTS created_by text REFERENCES auth.users(id);
