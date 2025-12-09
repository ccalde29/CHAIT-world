-- Fix Comments Foreign Key Constraints
-- This migration fixes the foreign key constraints for scene_comments and character_comments
-- Comments should reference community tables, not base scenario/character tables

-- Step 1: Drop incorrect foreign key constraints that point to wrong tables
ALTER TABLE scene_comments DROP CONSTRAINT IF EXISTS scene_comments_scene_id_fkey;
ALTER TABLE character_comments DROP CONSTRAINT IF EXISTS character_comments_character_id_fkey;

-- Step 2: Add correct foreign key constraints pointing to community tables
ALTER TABLE scene_comments
ADD CONSTRAINT scene_comments_scene_id_fkey
FOREIGN KEY (scene_id)
REFERENCES community_scenes(id)
ON DELETE CASCADE;

ALTER TABLE character_comments
ADD CONSTRAINT character_comments_character_id_fkey
FOREIGN KEY (character_id)
REFERENCES community_characters(id)
ON DELETE CASCADE;

-- Step 3: Fix user_id foreign keys to point to auth.users
-- Drop old constraints if they exist
ALTER TABLE scene_comments DROP CONSTRAINT IF EXISTS scene_comments_user_id_fkey;
ALTER TABLE character_comments DROP CONSTRAINT IF EXISTS character_comments_user_id_fkey;

-- Add new constraints to auth.users
ALTER TABLE scene_comments
ADD CONSTRAINT scene_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE character_comments
ADD CONSTRAINT character_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 4: Add missing created_at column to character_comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'character_comments'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE character_comments
    ADD COLUMN created_at timestamp without time zone DEFAULT now();

    -- Backfill existing rows
    UPDATE character_comments
    SET created_at = updated_at
    WHERE created_at IS NULL;
  END IF;
END $$;

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS scene_comments_scene_id_idx ON scene_comments(scene_id);
CREATE INDEX IF NOT EXISTS scene_comments_user_id_idx ON scene_comments(user_id);
CREATE INDEX IF NOT EXISTS scene_comments_created_at_idx ON scene_comments(created_at);

CREATE INDEX IF NOT EXISTS character_comments_character_id_idx ON character_comments(character_id);
CREATE INDEX IF NOT EXISTS character_comments_user_id_idx ON character_comments(user_id);
CREATE INDEX IF NOT EXISTS character_comments_created_at_idx ON character_comments(created_at);

-- Step 6: Verify the changes
SELECT
  'scene_comments foreign keys' as check_type,
  conname as constraint_name,
  confrelid::regclass as references_table
FROM pg_constraint
WHERE conrelid = 'scene_comments'::regclass
  AND contype = 'f';

SELECT
  'character_comments foreign keys' as check_type,
  conname as constraint_name,
  confrelid::regclass as references_table
FROM pg_constraint
WHERE conrelid = 'character_comments'::regclass
  AND contype = 'f';
