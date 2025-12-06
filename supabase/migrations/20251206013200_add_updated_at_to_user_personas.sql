-- Migration: Add updated_at column to user_personas table
-- The trigger update_user_personas_updated_at already exists but the column is missing

ALTER TABLE user_personas
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have the updated_at value
UPDATE user_personas
SET updated_at = created_at
WHERE updated_at IS NULL;
