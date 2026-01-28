-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only insert their own record
CREATE POLICY "Users can insert own record" ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = username);

-- Create policy: Users can update their own record (by auth_id)
CREATE POLICY "Users can update own record" ON users
FOR UPDATE
TO authenticated
USING (auth_id::text = auth.uid()::text);

-- Create policy: Users can view their own record
CREATE POLICY "Users can view own record" ON users
FOR SELECT
TO authenticated
USING (auth_id::text = auth.uid()::text);

-- Create policy: Users can delete their own record
CREATE POLICY "Users can delete own record" ON users
FOR DELETE
TO authenticated
USING (auth_id::text = auth.uid()::text);
