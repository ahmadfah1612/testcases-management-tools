-- Hybrid Migration: Supabase Auth + Custom Users Table
-- This keeps your custom users table but uses Supabase Auth for authentication

-- Step 1: Update the custom users table to reference auth.users
-- First, create a new column to reference auth.users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Update password_hash to allow null (since Supabase will handle passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 3: Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for users table
-- Allow everyone to view users (you can restrict this if needed)
CREATE POLICY "Allow public view users" ON users FOR SELECT USING (true);

-- Allow authenticated users to insert their own record
CREATE POLICY "Allow insert own user" ON users FOR INSERT 
  WITH CHECK (auth.uid() = auth_id);

-- Allow users to view their own record
CREATE POLICY "Allow view own user" ON users FOR SELECT 
  USING (auth.uid() = auth_id);

-- Allow users to update their own record (except role and auth_id)
CREATE POLICY "Allow update own user" ON users FOR UPDATE 
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id AND role = (SELECT role FROM users WHERE id = users.id));

-- Only admins can delete users
CREATE POLICY "Allow admins to delete users" ON users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Step 5: Create trigger to automatically create user record when Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create a record in custom users table
  INSERT INTO public.users (username, email, password_hash, role, auth_id)
  VALUES (
    -- Use email as username initially (extract from email)
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email,
    NULL, -- password_hash is null since Supabase handles it
    'user', -- default role
    NEW.id -- reference to auth.users
  )
  RETURNING id INTO new_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Update all other tables to reference auth.users instead of users table
-- But keep the created_by as UUID - we'll handle this in application logic

-- For now, we'll keep created_by referencing the custom users table
-- The application will use users.id for foreign keys, and we can join with auth.users when needed

-- Step 7: Create function to update user role (admin only)
CREATE OR REPLACE FUNCTION set_user_role(target_user_id UUID, new_role VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  UPDATE users SET role = new_role WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_role(UUID, VARCHAR) TO authenticated;

-- Step 8: Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Update existing users to sync with auth.users
-- Note: This is a manual step - you'll need to migrate existing users
-- See the user migration guide for instructions

-- Step 10: Create a view to combine auth and custom user data
CREATE OR REPLACE VIEW user_profile AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.created_at,
  u.auth_id,
  a.email AS auth_email,
  a.email_confirmed_at,
  a.last_sign_in_at,
  a.created_at AS auth_created_at
FROM users u
LEFT JOIN auth.users a ON u.auth_id = a.id;
