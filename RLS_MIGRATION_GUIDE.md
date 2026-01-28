# Row Level Security (RLS) Migration Guide

This guide helps you apply the proper RLS policies to fix the security issue while maintaining data protection.

## 🎯 What Was the Problem?

**Previous Setup:**
- Backend auth middleware: Used `req.dbUserId` from custom `users` table
- RLS policies: Expected `auth.uid()` (Supabase Auth user ID)
- **Result:** Mismatch caused security violations (blocking INSERT/UPDATE operations)

**New Setup:**
- Backend auth middleware: Uses `req.dbUserId` (which is now set to Supabase Auth ID via users table)
- RLS policies: Now match using `created_by` column with `auth.uid()::text`
- **Result:** Proper security with working data operations

## 🚀 How to Apply the SQL Migration

### Step 1: Go to Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Run the Migration

1. Copy the SQL from `backend/sql/fix-rls-policies.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** or **"Execute"**

This SQL will:
- ✅ Add `created_by` columns to all tables if missing
- ✅ Enable RLS on all tables
- ✅ Create proper security policies
- ✅ Allow users to access only their own records

### Step 3: Verify RLS Policies

After running the migration, check the policies:

1. Go to **Database → Table Editor**
2. Select any table (e.g., `test_suites`)
3. Click **"RLS Policies"** tab
4. You should see policies like:
   - "Users can insert own test suites"
   - "Users can update own test suites"
   - "Users can view own test suites"
   - "Users can delete own test suites"

## 🔍 Understanding the Fix

### How It Works Now:

**Backend Route (Example - Test Plans):**
```typescript
await supabase
  .from('test_plans')
  .insert({
    name,
    description,
    created_by: req.dbUserId  // ✅ Supabase Auth ID
  })
```

**RLS Policy:**
```sql
CREATE POLICY "Users can insert own test plans" ON test_plans
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);  -- ✅ Matches!
```

### Comparison:

| Component | Before | After |
|-----------|--------|-------|
| Backend auth.dbUserId | Custom users.id | ✅ Supabase Auth user.id |
| RLS policy expected | auth.uid() | ✅ auth.uid()::text (matches users.id) |
| Result | ❌ Security violation | ✅ Works! |

## 📋 What Tables Are Fixed?

All these tables now have proper RLS:
- `test_suites` - Created_by column, RLS enabled, policies set
- `test_cases` - Created_by column, RLS enabled, policies set
- `test_plans` - Created_by column, RLS enabled, policies set
- `test_runs` - Created_by column, RLS enabled, policies set
- `test_schedules` - Created_by column, RLS enabled, policies set

## 🧪 After Applying Migration

### Test the Application

1. Go to your frontend: `https://testcases-management-tools-frontend.vercel.app`
2. Try to login with existing account
3. Try to create a test suite
4. Try to create a test case
5. Try to create a test plan

All should now work without security violations!

### Check Backend Logs

If there are still issues:

1. Go to Railway Dashboard
2. Click on your backend service
3. Go to **"Logs"** tab
4. Look for any errors during operations

## 📊 RLS Policy Structure

Each table has 4 policies:

```sql
-- INSERT: Users can only create their own records
CREATE POLICY "Users can insert own records" ON table_name
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::text);

-- UPDATE: Users can only update their own records
CREATE POLICY "Users can update own records" ON table_name
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

-- SELECT: Users can only view their own records
CREATE POLICY "Users can view own records" ON table_name
FOR SELECT
TO authenticated
USING (created_by = auth.uid()::text);

-- DELETE: Users can only delete their own records
CREATE POLICY "Users can delete own records" ON table_name
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);
```

## ✅ Benefits of This Fix

1. **Security:** Users can only access/modify their own data
2. **Compliance:** Uses Supabase's recommended auth.uid() approach
3. **Compatibility:** Works with Railway + Vercel deployment
4. **Maintainability:** Clear policy names and structure
5. **No Data Loss:** Existing data preserved, only columns added

## 🎯 Quick Steps

1. ✅ Apply SQL migration in Supabase SQL Editor
2. ✅ Verify RLS policies are created
3. ✅ Test login and create operations
4. ✅ Everything should work!

## 📚 Additional Information

- The `created_by` column stores the Supabase Auth user ID
- RLS policies compare `created_by` with `auth.uid()`
- The `::text` cast ensures string comparison
- All policies apply to `authenticated` role (logged-in users)

## 🆘 Still Having Issues?

If operations still fail after applying RLS:

1. Check the backend logs on Railway
2. Verify the SQL migration executed successfully
3. Check that created_by columns were added to all tables
4. Try the backend API directly with curl:
   ```bash
   curl -X POST https://testcases-management-tools-production-fd46.up.railway.app/api/testsuites \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Suite","description":"test"}'
   ```

Let me know if you encounter any issues after applying the migration!
