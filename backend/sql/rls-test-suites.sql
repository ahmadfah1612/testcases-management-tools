-- Enable RLS
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own test suites (using created_by)
CREATE POLICY "Users can insert own test suites" ON test_suites
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can update their own test suites
CREATE POLICY "Users can update own test suites" ON test_suites
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can view their own test suites
CREATE POLICY "Users can view own test suites" ON test_suites
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can delete their own test suites
CREATE POLICY "Users can delete own test suites" ON test_suites
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);
