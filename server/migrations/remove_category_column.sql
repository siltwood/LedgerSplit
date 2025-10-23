-- Migration: Remove category column from splits table
-- Run this in Supabase SQL Editor

-- Drop the category column from the splits table
ALTER TABLE splits
DROP COLUMN IF EXISTS category;

-- Add a comment
COMMENT ON TABLE splits IS 'Splits table - category column removed';
