# Bill Splitting App - Frontend

React + TypeScript frontend for managing shared expenses and debts.

## Features

- ✅ Authentication (Email/Password + Google OAuth)
- ✅ Dashboard with balance overview
- ✅ Create & manage groups
- ✅ Add expenses with flexible split options (equal, exact amounts)
- ✅ View balances (total, per-person, per-group)
- ✅ Record settlements
- ✅ Friends system

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **React Router** - Routing
- **Axios** - API calls
- **Vite** - Build tool

## Project Structure

```
src/
├── pages/           # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Groups.tsx
│   ├── CreateGroup.tsx
│   └── CreateExpense.tsx
├── components/      # Reusable components
│   └── Layout.tsx
├── context/         # React context
│   └── AuthContext.tsx
├── services/        # API services
│   └── api.ts
├── types/           # TypeScript types
│   └── index.ts
└── App.tsx          # Main app component
```

## API Integration

The app connects to the backend API at `http://localhost:3001/api`.

Make sure the backend server is running before starting the frontend.

## Environment

Development server runs on: `http://localhost:5173`

Backend API: `http://localhost:3001/api`