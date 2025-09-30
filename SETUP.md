# Bill Splitting App - Setup Guide

## What's Built ✅

### Complete Backend API
- **Authentication**: Email/password + Google OAuth
- **Groups**: Full CRUD with member management
- **Expenses**: Create/edit/delete with custom splits (equal, exact, percentages, shares)
- **Settlements**: Record payments between users
- **Friends**: Friend system with requests
- **Balances**: Calculate exact debts between users (no simplification)
- **File Upload**: Receipt uploads with Multer

### Technical Stack
- **Framework**: Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: express-session + bcrypt
- **Security**: Helmet, rate limiting, CORS
- **File Handling**: Multer (5MB limit, images & PDFs)

### Database Schema ✅
See `database-schema.sql` - includes all tables ready to deploy

## Setup Instructions

### 1. Run the Database Schema
Go to your Supabase SQL Editor and run `database-schema.sql`

### 2. Configure Environment Variables
Your `.env` is already set up with:
- ✅ Google OAuth credentials
- ✅ Supabase URL and keys
- ✅ Session secret
- ⚠️ **TODO**: Add your email credentials for Nodemailer

Update these in `/server/.env`:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_specific_password
```

### 3. Start the Server
```bash
cd server
npm run dev
```

Server runs on `http://localhost:3001`

### 4. Test Authentication Endpoints

#### Register (Email/Password)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Google OAuth
```bash
# Get the Google auth URL
curl http://localhost:3001/api/auth/google
# Then visit that URL in your browser
```

#### Get Current User
```bash
curl http://localhost:3001/api/auth/me
```

## What's Next

### Still TODO:
1. **API Endpoints** for:
   - Groups (CRUD)
   - Expenses (CRUD with splits)
   - Settlements
   - Friends
   - Balances calculation

2. **Balance Calculation Logic**
   - Track exact debts between users
   - No simplification algorithm

3. **File Upload** (Multer)
   - Receipt uploads for expenses

4. **Frontend** (React app in `/client`)
   - Login/Register pages
   - Dashboard
   - Expense creation
   - Group management
   - Balance views

## Current File Structure
```
/server
  /src
    /config
      - database.ts (Supabase client)
      - google.ts (Google OAuth client)
    /controllers
      - authController.ts (all auth logic)
    /middleware
      - auth.ts (requireAuth middleware)
    /routes
      - auth.ts (auth endpoints)
    /utils
      - email.ts (Nodemailer functions)
    - index.ts (Express app entry point)
  - .env
  - .env.example
  - .gitignore
  - package.json
  - tsconfig.json
```

## API Endpoints Currently Available

### Auth
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout

### Health
- `GET /health` - Health check