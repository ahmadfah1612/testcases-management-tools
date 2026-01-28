-- Enable RLS
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own schedules (using created_by)
CREATE POLICY "Users can insert own schedules" ON test_schedules
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can update their own schedules
CREATE POLICY "Users can update own schedules" ON test_schedules
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

-- Create policy: Users can view their own schedules
CREATE POLICY "Users can view own schedules" ON test_schedules
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

-- Create policy: Users can delete their own schedules
CREATE POLICY "Users can delete own schedules" ON test_schedules
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);
