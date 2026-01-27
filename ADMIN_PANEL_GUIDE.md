# Admin User Management Panel

## Overview

A new admin panel has been added to manage users in the application. Only users with the 'admin' role can access and use this feature.

## Setup Instructions

### 1. Run the Database Migration

Execute the migration SQL to add the `role` column to the users table:

```bash
# Connect to your Supabase project
# Go to SQL Editor
# Run the content of: backend/migrations/add_user_role.sql
```

**OR execute this SQL manually:**

```sql
-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add constraint to ensure only valid roles
ALTER TABLE users ADD CONSTRAINT check_role CHECK (role IN ('admin', 'user'));

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### 2. Set Up Your First Admin User

After running the migration, you need to manually set one user as admin. You can do this via Supabase SQL Editor:

```sql
-- Replace 'your-username' with your actual username
UPDATE users SET role = 'admin' WHERE username = 'your-username';
```

Or to set the first user as admin:

```sql
UPDATE users 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM users 
  ORDER BY created_at ASC 
  LIMIT 1
);
```

### 3. Restart the Backend Server

```bash
cd backend
npm run dev
```

### 4. Restart the Frontend Server

```bash
cd frontend
npm run dev
```

## Features

### Admin Panel Access

1. Log in as an admin user
2. Navigate to Dashboard
3. Click "Users" in the sidebar (only visible to admins)

### User Management Features

- **View All Users**: See all registered users in a table
- **Create New User**: Add users directly without requiring them to self-register
  - Set username, email, password
  - Assign role (admin or user)
- **Delete Users**: Remove users from the system
  - Cannot delete yourself
  - Shows confirmation dialog

### User Roles

- **admin**: Full access to all features, including user management
- **user**: Regular access, cannot access admin panel

## API Endpoints

### Get All Users
```
GET /api/users
Headers: Authorization: Bearer <token>
Response: Array of user objects
```

### Create User (Admin Only)
```
POST /api/users
Headers: Authorization: Bearer <token>
Body: {
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'user' (optional, defaults to 'user')
}
Response: Created user object
```

### Delete User (Admin Only)
```
DELETE /api/users/:id
Headers: Authorization: Bearer <token>
Response: Success message
```

## Backend Changes

### New Files
- `backend/src/routes/users.routes.ts` - User management API routes
- `backend/migrations/add_user_role.sql` - Database migration

### Modified Files
- `backend/src/middleware/auth.middleware.ts` - Added role-based authorization
  - New `adminMiddleware()` function
  - Updated `authMiddleware()` to fetch user role
- `backend/src/routes/auth.routes.ts` - Include role in user responses
- `backend/src/index.ts` - Register users routes

## Frontend Changes

### New Files
- `frontend/src/app/dashboard/users/page.tsx` - User management UI

### Modified Files
- `frontend/src/lib/auth-context.tsx` - Added role support and `isAdmin()` helper
- `frontend/src/app/dashboard/layout.tsx` - Added Users link to sidebar (admin only)

## Security Notes

- Only admin users can access the Users page
- Only admin users can create or delete other users
- Users cannot delete themselves
- Passwords are hashed using bcrypt (10 rounds)
- All user management actions require JWT authentication

## Troubleshooting

### Users page not appearing in sidebar

1. Check that you're logged in as an admin user
2. Verify the `role` column was added to the database
3. Check your user has `role = 'admin'` in the database
4. Refresh the page

### Cannot access /api/users endpoints

1. Verify JWT token is valid
2. Check that your user has admin role
3. Ensure backend server is running
4. Check browser console for errors

### Migration errors

1. Ensure you're running the migration in the correct Supabase project
2. Check that the users table exists
3. Verify you have proper permissions in Supabase

## Testing

### Test User Creation

1. Log in as admin
2. Go to Dashboard > Users
3. Click "Create User"
4. Fill in user details
5. Select role (admin or user)
6. Click "Create User"
7. Verify user appears in the table

### Test User Deletion

1. Log in as admin
2. Go to Dashboard > Users
3. Click "Delete" on a user (not yourself)
4. Confirm deletion
5. Verify user is removed from the table

### Test Role-Based Access

1. Log in as admin
2. Note that "Users" link appears in sidebar
3. Logout and log in as regular user
4. Verify "Users" link is not visible
5. Try accessing /dashboard/users directly - should see access denied

## Future Enhancements

Potential improvements for the admin panel:

- [ ] Edit user details (username, email, role)
- [ ] Change user passwords
- [ ] Bulk user operations
- [ ] User activity logs
- [ ] Search and filter users
- [ ] Pagination for large user lists
- [ ] User statistics and analytics
