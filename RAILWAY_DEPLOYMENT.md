# Railway Deployment Guide (Default Settings)

This guide helps you deploy backend to Railway using Railway's default settings.

## 🚀 Quick Deployment (3 Steps)

### Step 1: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** or **"Sign Up"** (use GitHub)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select repository: `ahmadfah1612/testcases-management-tools`
5. Click **"Import"**

### Step 2: Create Backend Service

1. Click **"+ New Service"** → **"GitHub"**
2. Select your repository
3. **Set Root Directory:** `backend`
4. Click **"Create Service"** (use all defaults - Railway will auto-detect!)

Railway will automatically:
- Detect Node.js project
- Use package.json scripts
- Set up build and start commands
- Install dependencies

### Step 3: Add Environment Variables

1. Click on your new service
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add these:

```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres
SUPABASE_URL=https://ygjozkgfrzdfcxzzxhsh.supabase.co
SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_actual_supabase_service_role_key_here
JWT_SECRET=generate_random_32_char_string_here
NODE_ENV=production
```

Click **"Redeploy"** after adding variables.

### Step 4: Get Your Backend URL

1. Click on your service
2. Click **"Settings"** tab
3. Copy the **"Public URL"** (looks like: `https://app-name.up.railway.app`)

### Step 5: Test Backend

```bash
curl https://your-railway-url.up.railway.app/api/health
```

Should return:
```json
{"status":"ok","message":"Test Management API is running"}
```

### Step 6: Update Frontend on Vercel

1. Go to Vercel → Frontend → Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api
   ```
3. Redeploy frontend

## 📊 Done!

Your app architecture:
- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** Supabase

## 🔧 Troubleshooting

### Build Failed

**Error:** Build command not found or npm install failed

**Solution:**
1. Go to Service → Settings → Build
2. Set: `Build Command` = `npm ci`
3. Click **"Redeploy"**

### Can't Access API

**Error:** NOT_FOUND or connection refused

**Solution:**
1. Check service status (should be green/running)
2. Click **"Logs"** tab to see startup errors
3. Verify PORT=3001 is set in Variables
4. Test health endpoint directly with curl

### Database Connection Failed

**Error:** Can't connect to Supabase

**Solution:**
1. Verify DATABASE_URL is correct
2. Check Supabase project is active (not paused)
3. Look at Railway logs for specific error
4. Test DATABASE_URL locally first

### CORS Errors

**Error:** Request blocked by CORS

**Solution:**
Your backend CORS is already set to allow all origins in `src/index.ts`:
```typescript
app.use(cors());
```

If you still have issues, Railway allows this in Settings.

### Environment Variables Not Working

**Error:** undefined env vars or secrets

**Solution:**
1. Make sure you clicked **"New Variable"** (not just typed)
2. Verify all required vars are present
3. Click **"Redeploy"** after adding vars
4. Check logs for missing variable errors

## 📋 Environment Variables Checklist

Copy and paste these exact keys into Railway (replace values):

```
Key: DATABASE_URL
Value: postgresql://postgres:[PASSWORD]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres

Key: SUPABASE_URL
Value: https://ygjozkgfrzdfcxzzxhsh.supabase.co

Key: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual key)

Key: SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual key)

Key: JWT_SECRET
Value: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u (32 chars)

Key: NODE_ENV
Value: production

Key: PORT
Value: 3001
```

## 📊 Deployment Architecture

```
User → Vercel Frontend (Next.js)
           ↓
           API Calls
           ↓
    Railway Backend (Express API)
           ↓
        Supabase Database
```

## 🎯 Quick Reference

**Railway Dashboard:** https://railway.app
**Your Repository:** ahmadfah1612/testcases-management-tools
**Backend Directory:** backend (NO Dockerfile needed!)
**Framework:** Node.js (auto-detected)

## ✅ Success Checklist

- [ ] Railway project created
- [ ] Backend service added (Empty Service, no Dockerfile)
- [ ] All environment variables set
- [ ] Service deployed successfully
- [ ] Health check returns: {"status":"ok","message":"Test Management API is running"}
- [ ] Frontend NEXT_PUBLIC_API_URL updated to Railway URL
- [ ] Frontend redeployed on Vercel
- [ ] Can login to deployed app
- [ ] Can create test cases
- [ ] All API calls working

## 💡 Tips

1. **Always test health endpoint first** - If this works, everything else should too
2. **Check logs frequently** - Railway logs are very detailed and helpful
3. **Save Railway URL** - You'll need this for frontend configuration
4. **Redeploy after env changes** - Changes to variables require redeploy
5. **Monitor usage** - Railway has generous free tier, but good to track
