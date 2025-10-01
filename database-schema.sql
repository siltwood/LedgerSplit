-- Bill Splitting App Database Schema

-- Create our own users table (separate from auth.users)
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  currency_preference TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (group_id, user_id)
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  paid_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Expense Splits Table
CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id UUID NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_owed DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);

-- Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
  settlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE SET NULL,
  paid_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  paid_to UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Friends Table
CREATE TABLE IF NOT EXISTS friends (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- Group Invites Table
CREATE TABLE IF NOT EXISTS group_invites (
  invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  invited_user UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  UNIQUE(group_id, invited_user)
);

-- Email Invites Table (for non-registered users)
CREATE TABLE IF NOT EXISTS email_invites (
  invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('friend', 'group')),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  token UUID DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email, invite_type, group_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_paid_by ON settlements(paid_by);
CREATE INDEX IF NOT EXISTS idx_settlements_paid_to ON settlements(paid_to);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_invited_user ON group_invites(invited_user);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status);
CREATE INDEX IF NOT EXISTS idx_email_invites_email ON email_invites(email);
CREATE INDEX IF NOT EXISTS idx_email_invites_token ON email_invites(token);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);