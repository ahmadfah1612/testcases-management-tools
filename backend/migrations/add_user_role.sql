-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add constraint to ensure only valid roles
ALTER TABLE users ADD CONSTRAINT check_role CHECK (role IN ('admin', 'user'));

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set the first user as admin (you'll need to check your existing users)
-- Uncomment and modify the username below to set your admin user:
-- UPDATE users SET role = 'admin' WHERE username = 'your-username';
