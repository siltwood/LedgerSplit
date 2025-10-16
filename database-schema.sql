-- LedgerSplit Database Schema - Events & Splits Model
-- Drop everything and recreate with clean schema

-- Drop views first
DROP VIEW IF EXISTS user_balances CASCADE;
DROP VIEW IF EXISTS split_details CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS user_event_preferences CASCADE;
DROP TABLE IF EXISTS event_settled_confirmations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS split_participants CASCADE;
DROP TABLE IF EXISTS splits CASCADE;
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create our own users table (separate from auth.users)
CREATE TABLE users (
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
CREATE TABLE password_reset_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events Table (e.g., "Vegas Trip", "Dinner with Friends")
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(), -- For shareable event links
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  is_settled BOOLEAN DEFAULT FALSE
);

-- Event Participants Table (people involved in this event)
CREATE TABLE event_participants (
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Splits Table (simplified expenses within events)
CREATE TABLE splits (
  split_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  paid_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  category TEXT, -- Optional: 'food', 'transportation', 'lodging', 'entertainment', 'groceries', 'other'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Split Participants Table (who this split is divided between)
CREATE TABLE split_participants (
  split_id UUID NOT NULL REFERENCES splits(split_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_owed DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (split_id, user_id)
);

-- Payments Table (track when debts are settled)
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  payment_date TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Event Settled Confirmations Table (track which participants confirmed event is settled)
CREATE TABLE event_settled_confirmations (
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  confirmed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- User Event Preferences Table (track per-user settings like dismiss)
CREATE TABLE user_event_preferences (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, event_id)
);

-- Indexes for better query performance
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_deleted_at ON events(deleted_at);
CREATE INDEX idx_events_share_token ON events(share_token);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_splits_event_id ON splits(event_id);
CREATE INDEX idx_splits_paid_by ON splits(paid_by);
CREATE INDEX idx_splits_created_by ON splits(created_by);
CREATE INDEX idx_splits_date ON splits(date);
CREATE INDEX idx_splits_deleted_at ON splits(deleted_at);
CREATE INDEX idx_splits_category ON splits(category);
CREATE INDEX idx_split_participants_user_id ON split_participants(user_id);
CREATE INDEX idx_payments_event_id ON payments(event_id);
CREATE INDEX idx_payments_from_user_id ON payments(from_user_id);
CREATE INDEX idx_payments_to_user_id ON payments(to_user_id);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_event_settled_confirmations_event_id ON event_settled_confirmations(event_id);
CREATE INDEX idx_event_settled_confirmations_user_id ON event_settled_confirmations(user_id);
CREATE INDEX idx_user_event_preferences_user_id ON user_event_preferences(user_id);
CREATE INDEX idx_user_event_preferences_event_id ON user_event_preferences(event_id);

-- Helper views for calculating balances

-- View: All splits with participant details
CREATE VIEW split_details AS
SELECT
  s.split_id,
  s.event_id,
  s.title,
  s.amount,
  s.paid_by,
  s.date,
  sp.user_id as owes_user_id,
  sp.amount_owed
FROM splits s
JOIN split_participants sp ON s.split_id = sp.split_id
WHERE s.deleted_at IS NULL;

-- View: User balances (who owes whom)
CREATE VIEW user_balances AS
SELECT
  sd.owes_user_id as user_id,
  sd.paid_by as other_user_id,
  SUM(sd.amount_owed) as amount
FROM split_details sd
WHERE sd.owes_user_id != sd.paid_by
GROUP BY sd.owes_user_id, sd.paid_by;
