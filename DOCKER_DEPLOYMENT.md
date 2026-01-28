# Docker Deployment Guide

This guide helps you deploy both backend and frontend together using Docker.

## 🚀 Quick Deployment Options

### Option 1: Docker Compose (Recommended for Development/Testing)

**Best for:** Development, staging, self-hosted VPS

```bash
# Create .env file with your credentials
cat > .env << EOF
DATABASE_URL=postgresql://postgres:[password]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres
SUPABASE_URL=https://ygjozkgfrzdfcxzzxhsh.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=random_32_char_string
EOF

# Start everything
docker-compose up -d
```

Access at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Option 2: Railway (Easiest for Production)

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select: `ahmadfah1612/testcases-management-tools`
4. Click **"Import"**
5. Railway will auto-detect Dockerfile

**Add Environment Variables:**
```
DATABASE_URL=postgresql://postgres:[password]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres
SUPABASE_URL=https://ygjozkgfrzdfcxzzxhsh.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=random_32_char_string
```

**Get URL:** Railway provides a public URL

### Option 3: Render (Free Tier Available)

**Steps:**
1. Go to [render.com](https://render.com)
2. Click **"New Web Service"**
3. Connect GitHub
4. Select: `ahmadfah1612/testcases-management-tools`
5. Configure:
   - **Docker Context:** `/` (root)
   - **Environment:** `Docker`
   - **Dockerfile Path:** `Dockerfile`

**Add Environment Variables:**
Same as Railway above

### Option 4: Fly.io (Global Deployment)

**Steps:**
1. Install Fly CLI: `npm i -g @flyio/flyctl`
2. Login: `flyctl auth login`
3. Run: `flyctl launch`
4. Add environment variables: `flyctl secrets set`
5. Deploy: `flyctl deploy`

### Option 5: DigitalOcean App Platform

**Steps:**
1. Go to [digitalocean.com](https://digitalocean.com)
2. Click **"Apps"** → **"Create App"**
3. Choose **"Deploy a Docker Image"**
4. Connect GitHub
5. Select repository
6. Add environment variables
7. Deploy

### Option 6: Any VPS with Docker

**Steps:**
1. SSH into your VPS
2. Clone repo: `git clone https://github.com/ahmadfah1612/testcases-management-tools.git`
3. Create .env file with credentials
4. Run: `docker-compose up -d`
5. Setup Nginx reverse proxy (optional)

## 📋 Environment Variables Required

These are needed for ALL deployment options:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.ygjozkgfrzdfcxzzxhsh.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://ygjozkgfrzdfcxzzxhsh.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_KEY=your_actual_service_role_key

# Authentication
JWT_SECRET=generate_32_random_characters

# Node
NODE_ENV=production
PORT=3001
```

## 🔧 How to Get These Credentials

1. **Supabase:** Go to [supabase.com](https://supabase.com)
   - **Settings → API** → Project URL
   - **Settings → API** → anon/public key
   - **Settings → API** → service_role key
   - **Settings → Database** → Connection String → URI

2. **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## 📊 Deployment Comparison

| Platform | Free Tier | Best For | Deployment Type |
|-----------|-----------|------------|-----------------|
| Docker Compose | Yes (your server) | Development | Local/VPS |
| Railway | Yes ($5/mo after) | Simple | Docker |
| Render | Yes | Production | Docker |
| Fly.io | Yes (limited) | Global | Docker |
| DigitalOcean | No ($4/mo) | Reliable | Docker |
| VPS (DigitalOcean/Linode/Hetzner) | Yes (depends) | Full control | Docker |

## 🚀 Quick Start (Railway - Recommended)

Railway is the easiest for Docker deployment:

```bash
# 1. Go to railway.app
# 2. Import your GitHub repo
# 3. Railway auto-detects Dockerfile
# 4. Add environment variables
# 5. Click deploy
# Done! You get a public URL
```

## 🔧 Troubleshooting

### Build Failed

**Error:** `npm install` failed during build

**Solution:**
1. Check backend/package.json has correct dependencies
2. Verify Dockerfile COPY commands are correct
3. Check logs for specific error message

### Can't Connect to Database

**Error:** Database connection refused

**Solution:**
1. Verify DATABASE_URL is correct
2. Check Supabase project is active (not paused)
3. Test connection locally first

### Can't Access Application

**Error:** Connection refused or timeout

**Solution:**
1. Check container is running: `docker ps`
2. Check logs: `docker logs <container_name>`
3. Verify ports are exposed correctly (3000, 3001)
4. Check firewall allows those ports

### Environment Variables Not Working

**Error:** undefined variables or missing credentials

**Solution:**
1. Verify variable names are exactly as specified
2. Check platform's env variable syntax
3. Redeploy after adding variables
4. Check logs for errors loading env vars

## 📝 Development vs Production

### Development (Docker Compose)
```bash
# Start both services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production (Railway/Render/etc)
- Platform handles deployment automatically
- Updates on git push (if configured)
- Automatic scaling options
- Built-in monitoring

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Dockerfile created
- [ ] Tested locally with docker-compose
- [ ] Deployed to production platform
- [ ] Backend health check: `curl /api/health`
- [ ] Can access frontend
- [ ] Can login to app
- [ ] Can create test cases
- [ ] All API calls working

## 🎯 Recommendation

**For Fast, Easy Deployment:** Use Railway
- Auto-detects Dockerfile
- Easy env variable management
- Free tier available
- HTTPS automatically
- CI/CD built-in

**For Full Control:** Use VPS with Docker Compose
- Complete control
- Self-hosted
- Can scale as needed
- Lower long-term cost

**For Development:** Use Docker Compose Locally
- Test before deploying
- Easy to debug
- Quick iterations

## 💡 Tips

1. **Test locally first** - Use `docker-compose up` to verify everything works
2. **Use environment files** - Never commit actual credentials
3. **Check logs** - Every platform has detailed logs
4. **Monitor costs** - Free tiers have limits, track usage
5. **Use health checks** - Platform will auto-restart if backend fails

## 📞 Support

If you encounter issues:
1. Check platform's documentation
2. Look at build and deployment logs
3. Test with simpler configuration first
4. Check if it's a known issue in platform's status page
