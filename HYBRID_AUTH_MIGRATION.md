# Hybrid Auth Migration Guide

## Overview

This migration implements a **Hybrid Authentication System** that combines:
- **Supabase Auth** - Secure authentication with email/password, sessions, and built-in features
- **Custom users table** - Stores extra fields like `username` and `role`
- **Row Level Security (RLS)** - Automatic data protection for each user's data

## Benefits

✅ **Built-in security** - Supabase handles password hashing, sessions, and security
✅ **Email verification** - Optional feature to verify user emails
✅ **Password reset** - Built-in password reset functionality
✅ **Social auth ready** - Easy to add Google, GitHub, etc. login later
✅ **Row Level Security** - Automatic protection of user data
✅ **Custom fields** - Keep username, role, and other custom data
✅ **Simpler code** - Less custom auth code to maintain

## Migration Steps

### Step 1: Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run the migration script:

Copy and run: `backend/migrations/migrate_to_hybrid_auth.sql`

**This will:**
- Add `auth_id` column to users table (references Supabase Auth)
- Update password_hash to allow NULL (Supabase handles passwords now)
- Enable RLS with proper policies
- Create trigger to auto-create user records when users sign up
- Create helper functions for role management

### Step 2: Restart Backend

```bash
cd backend
npm run dev
```

The backend auth routes are already updated to use Supabase Auth.

### Step 3: Restart Frontend

```bash
cd frontend
npm run dev
```

The frontend auth context is already updated to use Supabase Auth directly.

### Step 4: Test Registration

1. Go to `/register`
2. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `testpass123`
3. Click "Register"

**What happens:**
1. Supabase Auth creates a user with email/password
2. Trigger automatically creates a record in custom `users` table
3. Frontend fetches user data from custom table
4. User is logged in and redirected to dashboard

### Step 5: Set First Admin User

After registering your first account, go to **Supabase SQL Editor** and run:

```sql
UPDATE users 
SET role = 'admin' 
WHERE username = 'your-username';
```

Replace `your-username` with the username you registered.

### Step 6: Login and Verify

1. Logout if you're logged in
2. Go to `/login`
3. Login with your credentials
4. Navigate to **Dashboard**
5. You should see **"Users"** link in sidebar (because you're admin)

## What Changed

### Backend Changes

1. **auth.routes.ts** - Updated to use Supabase Auth:
   - Register: Creates Supabase Auth user + custom user record
   - Login: Authenticates with Supabase Auth using email
   - Verify: Validates JWT tokens

2. **auth.middleware.ts** - Updated to:
   - Verify Supabase Auth tokens instead of custom JWT
   - Fetch user role from custom users table
   - Keep adminMiddleware for role-based access

3. **Database Schema** - New structure:
   - `users.auth_id` → references `auth.users.id`
   - `users.password_hash` → nullable (Supabase handles it)
   - RLS policies enabled on all tables
   - Trigger auto-creates user records

### Frontend Changes

1. **auth-context.tsx** - Updated to use Supabase Auth directly:
   - No longer calls backend `/api/auth/register` or `/api/auth/login`
   - Uses `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`
   - Fetches custom user data from `users` table
   - Manages Supabase session state

2. **api.ts** - Updated to use Supabase session token:
   - Gets session token from `supabase.auth.getSession()`
   - Includes Supabase access token in Authorization header
   - No longer uses localStorage for tokens

## Database Structure

### users table
```sql
- id (UUID, primary key) - our custom ID
- username (VARCHAR) - custom field
- email (VARCHAR) - stored from auth
- password_hash (TEXT, nullable) - now handled by Supabase
- role (VARCHAR) - custom field for access control
- created_at (TIMESTAMP)
- auth_id (UUID, foreign key) - references auth.users.id
```

### auth.users table
Supabase's built-in authentication table (managed by Supabase)

## API Changes

### Old Custom Auth (Removed)
```
POST /api/auth/register - Custom registration
POST /api/auth/login - Custom login
```

### New Supabase Auth (Used by Frontend Directly)
```
supabase.auth.signUp() - Registration
supabase.auth.signInWithPassword() - Login
supabase.auth.signOut() - Logout
```

### Backend API Endpoints (Still Use Supabase Auth)
```
GET /api/users - Requires Supabase auth token
POST /api/users - Requires Supabase auth token + admin role
DELETE /api/users/:id - Requires Supabase auth token + admin role
```

## Migrating Existing Users

If you had existing users before migration, they won't have `auth_id` set. To migrate them:

1. Register again with same username/email
2. This will create new Supabase Auth account
3. The old user record will be orphaned
4. Delete old user records in SQL:

```sql
-- Delete users without auth_id (old users)
DELETE FROM users WHERE auth_id IS NULL;
```

**Or** create a migration script to create Supabase Auth accounts for existing users (more complex).

## Row Level Security Policies

### Users Table
- **SELECT**: Anyone can view users (change if needed)
- **INSERT**: Users can insert their own record (trigger)
- **UPDATE**: Users can update their own record
- **DELETE**: Only admins can delete users

### Other Tables (test_suites, test_cases, etc.)
- **SELECT**: Users can view their own data
- **INSERT**: Users can insert their own data
- **UPDATE**: Users can update their own data
- **DELETE**: Users can delete their own data

**Note:** Admins don't have special access to other users' data by default. You can add admin policies if needed:

```sql
-- Allow admins to view all test cases
CREATE POLICY "Admins can view all test cases" ON test_cases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );
```

## Troubleshooting

### Registration fails with "Email already exists"

This means the email is already registered in Supabase Auth:
1. Try logging in instead
2. Or use a different email
3. Go to Supabase Dashboard → Authentication → Users to see existing users

### Login fails with "Invalid credentials"

1. Check username is correct
2. Check password is correct
3. Make sure email is verified (if email verification is enabled)
4. Check Supabase Dashboard → Authentication → Users to see if user exists

### Can't see "Users" link in dashboard

1. Make sure you're logged in
2. Check your role in database:

```sql
SELECT username, email, role FROM users;
```

3. Update your role to admin:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your-username';
```

### RLS blocking operations

If you get RLS errors, check policies are enabled correctly:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'users';
```

## Testing

### Test Registration Flow
1. Go to `/register`
2. Enter valid username, email, password
3. Submit
4. Should redirect to `/dashboard`
5. Check Supabase Dashboard → Authentication → Users - user should exist
6. Check database `users` table - record should exist with `auth_id`

### Test Login Flow
1. Logout
2. Go to `/login`
3. Enter username and password
4. Submit
5. Should redirect to `/dashboard`
6. Check session in Supabase Dashboard → Authentication → Sessions

### Test Admin Features
1. Set user role to 'admin' in database
2. Login as admin
3. Go to `/dashboard/users`
4. Should see user management panel
5. Try creating a new user
6. Try deleting a user (not yourself)

### Test Regular User Features
1. Create regular user (role: 'user')
2. Login
3. Go to `/dashboard`
4. Should NOT see "Users" link
5. Try accessing `/dashboard/users` directly - should get access denied

## Future Enhancements

- [ ] Enable email verification
- [ ] Add password reset functionality
- [ ] Add social login (Google, GitHub)
- [ ] Add email notifications
- [ ] Add user profile editing
- [ ] Add avatar support
- [ ] Add two-factor authentication
- [ ] Add audit logs

## Security Notes

✅ Passwords are never stored in your database - Supabase handles them securely
✅ Sessions are managed by Supabase with proper expiration
✅ Row Level Security prevents data leaks
✅ JWT tokens are signed with your secret key
✅ Admin operations require explicit role check

## Rollback Plan

If you need to rollback:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop custom users table
DROP TABLE IF EXISTS users CASCADE;

-- Recreate old users table (without auth_id)
-- Run original schema from supabase-schema.sql
```

Then revert code changes (git checkout or manually revert files).
