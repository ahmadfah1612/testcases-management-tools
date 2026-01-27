# Supabase Migration Guide

This application has been migrated from Prisma + SQLite to Supabase (PostgreSQL).

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Wait for the project to be ready (usually takes 2-3 minutes)

### 2. Run SQL Schema

1. Navigate to your Supabase dashboard
2. Go to **SQL Editor** in the sidebar
3. Click **New Query**
4. Copy the content from `backend/supabase-schema.sql`
5. Paste it into the SQL Editor and click **Run**

This will create all necessary tables and indexes.

### 3. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Project Settings** (gear icon)
2. Navigate to **API** section
3. Copy the following values:
   - Project URL
   - anon public key

### 4. Configure Environment Variables

#### Backend (.env)

Update `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=3001
SUPABASE_URL="your-supabase-project-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Replace:
- `your-supabase-project-url` with your Supabase Project URL
- `your-supabase-anon-key` with your Supabase anon public key

#### Frontend (.env.local)

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Replace:
- `your-supabase-project-url` with your Supabase Project URL
- `your-supabase-anon-key` with your Supabase anon public key

### 5. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 6. Run the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Database Schema

The following tables are created in Supabase:

- `users` - User accounts
- `test_suites` - Test suites with hierarchical support
- `test_cases` - Individual test cases
- `test_case_versions` - Version history for test cases
- `test_plans` - Test plans
- `test_plan_assignments` - Many-to-many relationship between plans and cases
- `test_runs` - Test run executions
- `test_results` - Results of test executions
- `test_schedules` - Scheduled test runs

## Features

- ✅ PostgreSQL database via Supabase
- ✅ Full CRUD operations for all entities
- ✅ JWT-based authentication
- ✅ Real-time capabilities (ready to be implemented)
- ✅ Row Level Security (can be configured in Supabase)
- ✅ Automatic timestamp updates
- ✅ Cascade delete for related records

## Optional: Configure Row Level Security (RLS)

For enhanced security, you can enable RLS in Supabase:

1. Go to **Authentication** > **Policies** in Supabase dashboard
2. Enable RLS on each table
3. Create policies based on user access requirements

Example policy for test_cases:

```sql
-- Enable RLS
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own test cases
CREATE POLICY "Users can view own test cases"
ON test_cases FOR SELECT
USING (auth.uid()::text = created_by);

-- Policy: Users can only insert their own test cases
CREATE POLICY "Users can insert own test cases"
ON test_cases FOR INSERT
WITH CHECK (auth.uid()::text = created_by);

-- Policy: Users can only update their own test cases
CREATE POLICY "Users can update own test cases"
ON test_cases FOR UPDATE
USING (auth.uid()::text = created_by);

-- Policy: Users can only delete their own test cases
CREATE POLICY "Users can delete own test cases"
ON test_cases FOR DELETE
USING (auth.uid()::text = created_by);
```

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify your Supabase URL and keys are correct
2. Check that your Supabase project is active
3. Ensure you've run the SQL schema to create tables

### Authentication Issues

If authentication fails:
1. Check that JWT_SECRET is set in backend/.env
2. Verify Supabase credentials are correct
3. Clear browser localStorage and try again

### Database Schema Issues

If tables are missing:
1. Go to Supabase SQL Editor
2. Run the schema from `backend/supabase-schema.sql`
3. Refresh the page

## Migration from Prisma

The migration is complete. Prisma can be removed if desired:

```bash
cd backend
npm uninstall prisma @prisma/client
```

However, it's recommended to keep Prisma installed during the transition period in case you need to reference it.
