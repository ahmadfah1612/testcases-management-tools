-- Enable RLS
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own test plans (using created_by)
CREATE POLICY "Users can insert own test plans" ON test_plans
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can update their own test plans
CREATE POLICY "Users can update own test plans" ON test_plans
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can view their own test plans
CREATE POLICY "Users can view own test plans" ON test_plans
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can delete their own test plans
CREATE POLICY "Users can delete own test plans" ON test_plans
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);
