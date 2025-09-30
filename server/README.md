# Bill Splitting App - Backend Server

Complete Express/TypeScript backend API for managing shared expenses and debts.

## Features

- ✅ Authentication (Email/Password + Google OAuth)
- ✅ Groups management with members
- ✅ Expenses with flexible splits (equal, exact, percentages, shares)
- ✅ Settlements between users
- ✅ Friends system
- ✅ Exact balance calculations (no simplification)
- ✅ Receipt uploads
- ✅ Unit tests with Jest

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database schema
# Copy database-schema.sql into Supabase SQL Editor and execute

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run build` - Build for production
- `npm start` - Start production server

## API Endpoints

See [API.md](../API.md) for complete API documentation.

## Tech Stack

- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database
- **bcrypt** - Password hashing
- **express-session** - Session management
- **Google OAuth** - Third-party authentication
- **Multer** - File uploads
- **Helmet** - Security headers
- **Jest + Supertest** - Testing

## Test Coverage

```bash
npm run test:coverage
```

21 unit tests covering:
- Authentication flows
- Balance calculation logic
- Expense splitting (equal, unequal, multi-way)
- Settlement handling
- API endpoints

## Project Structure

```
src/
├── __tests__/          # Unit tests
├── config/             # Database & OAuth config
├── controllers/        # Business logic
├── middleware/         # Auth & upload middleware
├── routes/             # API routes
└── index.ts            # App entry point
```