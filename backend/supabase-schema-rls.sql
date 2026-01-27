-- Row Level Security and Auth Triggers (Run this AFTER base schema)

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view users (you can restrict this if needed)
DROP POLICY IF EXISTS "Allow public view users" ON users;
CREATE POLICY "Allow public view users" ON users FOR SELECT USING (true);

-- Allow authenticated users to insert their own record
DROP POLICY IF EXISTS "Allow insert own user" ON users;
CREATE POLICY "Allow insert own user" ON users FOR INSERT 
  WITH CHECK (auth.uid() = auth_id);

-- Allow users to view their own record
DROP POLICY IF EXISTS "Allow view own user" ON users;
CREATE POLICY "Allow view own user" ON users FOR SELECT 
  USING (auth.uid() = auth_id);

-- Allow users to update their own record
DROP POLICY IF EXISTS "Allow update own user" ON users;
CREATE POLICY "Allow update own user" ON users FOR UPDATE 
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id AND role = (SELECT role FROM users WHERE id = users.id));

-- Only admins can delete users
DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
CREATE POLICY "Allow admins to delete users" ON users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Create trigger to automatically create user record when Supabase Auth user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

-- Create function to update user role (admin only)
DROP FUNCTION IF EXISTS set_user_role(UUID, VARCHAR) CASCADE;

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

-- Create function to check if user is admin
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to combine auth and custom user data
DROP VIEW IF EXISTS user_profile CASCADE;
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
