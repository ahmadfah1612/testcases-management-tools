# Quick Setup Guide

Follow these steps to get the Test Case Management Tool running locally.

## 1. Prerequisites

Make sure you have installed:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm (comes with Node.js)

## 2. Database Setup

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL in a container
docker run --name test-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=testmanagement \
  -p 5432:5432 \
  -d postgres:16
```

### Option B: Local PostgreSQL

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database named `testmanagement`
3. Note your database credentials

## 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env file with your database credentials:
# DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testmanagement"
# JWT_SECRET="your-secret-key-change-this-in-production"
# PORT=3001

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start backend server
npm run dev
```

Backend should be running at `http://localhost:3001`

## 4. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional, defaults work for local dev)
cp .env.example .env.local

# Start frontend server
npm run dev
```

Frontend should be running at `http://localhost:3000`

## 5. First Run

1. Open `http://localhost:3000/register` in your browser
2. Create a new account
3. You'll be redirected to the dashboard
4. Start creating test suites and test cases!

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database credentials

### Prisma Client Generation Error
```bash
cd backend
npx prisma generate
```

### Port Already in Use
- Change PORT in backend/.env
- Change port in frontend/.env.local (if needed)

### Type Errors
- Ensure you've run `npm install` in both directories
- Restart your IDE/TypeScript server

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev                    # Start dev server with auto-reload
npm run prisma:studio           # Open database GUI
npm run prisma:migrate:dev       # Create new migration
```

### Frontend Development
```bash
cd frontend
npm run dev                    # Start dev server with auto-reload
npm run build                  # Build for production
npm run lint                   # Check for code issues
```

## Database Management

### Reset Database
```bash
cd backend
npx prisma migrate reset        # WARNING: Deletes all data!
```

### Open Prisma Studio
```bash
cd backend
npm run prisma:studio
```

## Testing the API

Use these cURL commands to test the backend:

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### Create Test Suite (requires auth token)
```bash
curl -X POST http://localhost:3001/api/testsuites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"API Tests","description":"All API related tests"}'
```

## Production Deployment

### Backend Deployment
1. Set production DATABASE_URL
2. Set secure JWT_SECRET
3. Run `npm run build`
4. Run `npm start`

### Frontend Deployment
1. Set NEXT_PUBLIC_API_URL to production API
2. Run `npm run build`
3. Deploy the `.next` folder

## Next Steps

- Read the full [README.md](./README.md) for feature details
- Check the [Database Schema](./README.md#-database-schema) section
- Explore the API endpoints documentation
- Customize the Neo-Brutalist design in `frontend/src/app/globals.css`