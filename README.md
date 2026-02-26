# LedgerSplit

A modern bill-splitting and expense tracking application for groups. Track shared expenses, split bills fairly, and settle up with friends.

## Features

- **Event-Based Organization**: Create events for trips, dinners, or any shared expense occasion
- **Bill Splitting**: Add bills and split them evenly among participants
- **Smart Balance Calculation**: Automatically calculates who owes whom and minimizes the number of transactions needed
- **Payment Tracking**: Record payments and mark bills as settled
- **Venmo Integration**: Quick pay via Venmo on mobile devices
- **Google OAuth**: Secure authentication with Google Sign-In
- **Real-time Updates**: Immediate balance updates as bills and payments are added
- **Search & Filter**: Easily find bills by payer, amount, or participant
- **Mobile Responsive**: Full functionality on both desktop and mobile devices

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Axios

### Backend
- Node.js
- Express
- TypeScript
- Supabase (PostgreSQL)
- Passport.js (Google OAuth)
- Jest (Testing)

### Infrastructure
- Heroku (Deployment)
- GitHub (Version Control)

## Project Structure

```
ledgersplit/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── styles/        # Style constants and themes
│   │   └── types/         # TypeScript type definitions
│   └── public/            # Static assets
├── server/                # Node.js backend application
│   ├── src/
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic layer
│   │   ├── scripts/       # Utility scripts
│   │   └── index.ts       # Server entry point
│   └── dist/              # Compiled TypeScript output
├── database-schema.sql    # PostgreSQL database schema
└── package.json           # Root package configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (via Supabase or local)
- Google OAuth credentials (for authentication)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/siltwood/LedgerSplit.git
cd LedgerSplit
```

2. Install dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Set up environment variables:

Create `.env` files in both `client/` and `server/` directories.

**Server `.env`:**
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your_session_secret

# SMTP (for password reset emails)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password
SMTP_FROM="YourApp" <noreply@yourdomain.com>

# Environment
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Client `.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:

Run the schema SQL file against your Supabase database:
```bash
psql -h your-supabase-host -U postgres -d postgres -f database-schema.sql
```

Or use the Supabase SQL Editor to execute the contents of `database-schema.sql`.

5. (Optional) Seed test data:
```bash
cd server
npm run seed
```

### Development

Run the development servers:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

### Building for Production

Build both client and server:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Testing

Run the test suite:
```bash
cd server
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## API Overview

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Events
- `GET /api/events` - List all user events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/join/:token` - Join event via share link
- `POST /api/events/:id/leave` - Leave event
- `DELETE /api/events/:id/participants/:userId` - Remove participant

### Splits (Bills)
- `GET /api/splits` - List splits (query by event_id)
- `POST /api/splits` - Create new split
- `GET /api/splits/:id` - Get split details
- `PUT /api/splits/:id` - Update split
- `DELETE /api/splits/:id` - Delete split

### Payments
- `GET /api/payments` - List payments (query by event_id)
- `POST /api/payments` - Record payment
- `DELETE /api/payments/:id` - Delete payment

### Settled Confirmations
- `POST /api/settled/:eventId/toggle` - Toggle user's settled confirmation

## Database Schema

The application uses the following main tables:

- **users** - User accounts and profiles
- **events** - Group events (trips, dinners, etc.)
- **event_participants** - Event membership
- **splits** - Bills/expenses
- **split_participants** - Who participated in each split
- **payments** - Payment records between users
- **event_settled_confirmations** - User confirmations that event is settled

See `database-schema.sql` for the complete schema definition.

## Deployment

The application is configured for deployment on Heroku with the included `Procfile`.

Deploy to Heroku:
```bash
git push heroku main
```

Ensure all environment variables are set in Heroku:
```bash
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key
# ... set all other environment variables
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue on GitHub.
