# Test Management Tools - Vercel Deployment Guide

This guide shows you how to deploy both the Next.js frontend and Express backend to Vercel.

## 🚀 Quick Deployment (Recommended)

### Step 1: Deploy Backend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure as **Backend Project**:
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. Add **Backend Environment Variables:**
   ```
   DATABASE_URL=your_supabase_database_url
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   JWT_SECRET=generate_a_random_32_character_string
   NODE_ENV=production
   ```

5. Click **Deploy**

6. After deployment, copy your backend URL (e.g., `https://test-management-backend.vercel.app`)

### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import the same GitHub repository
3. Configure as **Frontend Project**:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. Add **Frontend Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://test-management-backend.vercel.app/api
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS=2
   ```
   **Replace** `test-management-backend.vercel.app` with your actual backend URL from Step 1

5. Click **Deploy**

6. After deployment, your app will be available at `https://test-management-frontend.vercel.app`

## 📋 Environment Variables Reference

### Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (backend only!)

5. Go to **Settings → Database**
6. Copy **Connection String** → `DATABASE_URL`

### Generate JWT Secret

Generate a random 32+ character string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🛠 Using Vercel CLI

Alternatively, deploy using CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy backend
cd backend
vercel --prod
# Note the deployed URL

# Deploy frontend
cd ../frontend
# Update NEXT_PUBLIC_API_URL with backend URL
vercel --prod
```

## ✅ Verification

After deployment:

1. **Test Backend Health:**
   ```
   curl https://your-backend-url.vercel.app/api/health
   ```
   Should return: `{"status":"ok","message":"Test Management API is running"}`

2. **Test Frontend:**
   - Visit `https://your-frontend-url.vercel.app`
   - Try logging in
   - Create a test case
   - Verify API calls work

3. **Check Logs:**
   - Vercel Dashboard → Project → Deployments
   - Click on latest deployment
   - View Function Logs for backend
   - View Build Logs for any errors

## 🔄 Update Frontend API URL

After deploying backend, update frontend's `NEXT_PUBLIC_API_URL`:

**Using Vercel Dashboard:**
1. Go to frontend project settings
2. Environment Variables
3. Edit `NEXT_PUBLIC_API_URL`
4. Enter your backend URL
5. Redeploy

**Using CLI:**
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-backend-url.vercel.app/api
vercel --prod
```

## 🐛 Troubleshooting

### Backend Returns 404 or CORS Errors

**Solution:** Update backend CORS in `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: ['https://your-frontend-url.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

### API Routes Not Working

**Solutions:**
1. Check backend is deployed: visit `/api/health`
2. Verify `NEXT_PUBLIC_API_URL` includes `/api` suffix
3. Check environment variables are set in correct project
4. Review Vercel function logs

### Database Connection Issues

**Solutions:**
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active (not paused)
3. Ensure Supabase has all required tables

### Build Errors

**Solutions:**
```bash
# Test build locally
cd backend && npm run build
cd ../frontend && npm run build

# Clear cache in Vercel
# Go to project settings → Git → Clear Build Cache
```

## 📊 Post-Deployment Tasks

1. **Update CORS Configuration**
   - Add your production frontend URL to backend CORS

2. **Set Up Custom Domain** (Optional)
   - Vercel Dashboard → Project → Settings → Domains
   - Add your custom domain

3. **Configure Auto-Deployments**
   - Enable automatic deployments on git push
   - Set up preview deployments for branches

## 🔄 Local Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Frontend runs at http://localhost:3000
Backend API at http://localhost:3001

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
