-- Add category column to splits table
ALTER TABLE splits
ADD COLUMN category TEXT;

-- Add index for category filtering
CREATE INDEX idx_splits_category ON splits(category);

-- Valid categories: 'food', 'transportation', 'lodging', 'entertainment', 'groceries', 'other'
-- Note: NULL is allowed (uncategorized bills)
