-- Add venmo_username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS venmo_username TEXT;
