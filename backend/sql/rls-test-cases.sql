-- Enable RLS
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own test cases (using created_by)
CREATE POLICY "Users can insert own test cases" ON test_cases
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can update their own test cases
CREATE POLICY "Users can update own test cases" ON test_cases
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can view their own test cases
CREATE POLICY "Users can view own test cases" ON test_cases
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can delete their own test cases
CREATE POLICY "Users can delete own test cases" ON test_cases
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);
