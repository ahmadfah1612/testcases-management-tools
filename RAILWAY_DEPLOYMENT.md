# Railway Deployment Guide

This guide helps you deploy the backend to Railway.app and frontend to Vercel.

## 🚀 Step 1: Deploy Backend to Railway

### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub

### 2. Create New Project
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select repository: `ahmadfah1612/testcases-management-tools`
4. Click **"Import"**

### 3. Add Backend Service
1. Click **"+ New Service"** in your Railway project
2. Select **"Dockerfile"**
3. Choose your repository
4. **Set Root Directory:** `backend`
5. Click **"Create Service"**

### 4. Add Environment Variables
1. Click on your backend service
2. Go to **"Variables"** tab
3. Add these variables:

```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres
SUPABASE_URL=https://ygjozkgfrzdfcxzzxhsh.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
JWT_SECRET=generate_random_32_character_string
NODE_ENV=production
PORT=3001
```

### 5. Deploy
1. Click **"Redeploy"** on your service
2. Wait 2-3 minutes for deployment
3. Check the logs for any errors

### 6. Get Your Backend URL
1. Click on your backend service in Railway
2. Click on the **"Settings"** tab
3. Look for **"Public URL"** or **"Domains"**
4. Copy the URL (e.g., `https://test-management.up.railway.app`)

### 7. Test Backend
```bash
curl https://your-railway-url.up.railway.app/api/health
```

Should return:
```json
{"status":"ok","message":"Test Management API is running"}
```

## 🎨 Step 2: Deploy Frontend to Vercel

### 1. Update Frontend Environment Variable

1. Go to your Vercel Frontend Project
2. Navigate to **Settings → Environment Variables**
3. Update `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api
   ```
   (Replace with your actual Railway backend URL)
4. Click **Save**
5. **Redeploy** your frontend

### 2. Test Deployment

1. Visit your frontend Vercel URL
2. Try to login
3. Create a test case
4. Verify everything works

## 📊 Architecture Summary

| Component | Platform | URL | Purpose |
|-----------|-----------|------|---------|
| Backend | Railway | `https://your-app.up.railway.app` | Express API |
| Frontend | Vercel | `https://your-app.vercel.app` | Next.js UI |

## 🔧 Troubleshooting

### Railway Deployment Issues

**Build Failed:**
- Check Railway logs for errors
- Verify Dockerfile exists in backend directory
- Check environment variables are set correctly

**Can't Access API:**
- Verify service is running (green status in Railway)
- Check service logs for startup errors
- Test health endpoint: `/api/health`

**Database Connection Failed:**
- Verify DATABASE_URL is correct
- Check Supabase project is active
- Ensure database migrations have run

### Frontend Connection Issues

**CORS Errors:**
- Backend CORS should allow your Vercel frontend URL
- Check browser console for CORS errors

**API Not Found:**
- Verify `NEXT_PUBLIC_API_URL` includes `/api` suffix
- Check URL is correct (no typos)
- Verify backend is running and accessible

**Authentication Failed:**
- Check backend logs for auth errors
- Verify JWT_SECRET matches between frontend/backend
- Check Supabase credentials are correct

## 🎯 Quick Checklist

- [ ] Backend deployed to Railway successfully
- [ ] Backend health check returns success
- [ ] Frontend `NEXT_PUBLIC_API_URL` updated to Railway URL
- [ ] Frontend redeployed with new env var
- [ ] Can login in deployed app
- [ ] Can create test cases
- [ ] All API calls working

## 💡 Benefits of Railway + Vercel

- **Railway:** Great for backend APIs, always-on server, easy logs
- **Vercel:** Perfect for frontend, CDN, fast deployment
- **Separation:** Easier to debug and scale independently
- **Cost:** Both have free tiers for small projects

## 📝 Next Steps

After successful deployment:
1. Monitor Railway logs for any issues
2. Set up automatic deployments from git
3. Configure custom domains (optional)
4. Set up monitoring/alerts (optional)
