-- Add content locking fields to characters table
-- is_locked: indicates if the character has privacy restrictions
-- hidden_fields: array of field names that should be hidden when imported (e.g., ['personality', 'appearance', 'background'])
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_fields JSONB DEFAULT '[]'::jsonb;

-- Add content locking fields to scenarios table
-- is_locked: indicates if the scene has privacy restrictions
-- hidden_fields: array of field names that should be hidden when imported (e.g., ['description'])
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_fields JSONB DEFAULT '[]'::jsonb;

-- Create scene_comments table (separate from character_comments)
-- Allows users to comment on published scenes in the Community Hub
CREATE TABLE IF NOT EXISTS scene_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    scene_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment text NOT NULL CHECK (length(comment) >= 1 AND length(comment) <= 1000),
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scene_comments_scene ON scene_comments(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_comments_user ON scene_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_scene_comments_not_deleted ON scene_comments(scene_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_scene_comments_created ON scene_comments(created_at DESC);

-- Add RLS (Row Level Security) policies for scene_comments
ALTER TABLE scene_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all non-deleted comments
CREATE POLICY "Users can view non-deleted scene comments"
ON scene_comments FOR SELECT
USING (is_deleted = false);

-- Policy: Users can insert their own comments
CREATE POLICY "Users can insert their own scene comments"
ON scene_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own scene comments"
ON scene_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can soft-delete their own comments
CREATE POLICY "Users can delete their own scene comments"
ON scene_comments FOR DELETE
USING (auth.uid() = user_id);

-- Add comments to document the schema
COMMENT ON COLUMN characters.is_locked IS 'Indicates if character has privacy restrictions when published';
COMMENT ON COLUMN characters.hidden_fields IS 'Array of field names to hide on import (e.g., ["personality", "appearance", "background"])';
COMMENT ON COLUMN scenarios.is_locked IS 'Indicates if scene has privacy restrictions when published';
COMMENT ON COLUMN scenarios.hidden_fields IS 'Array of field names to hide on import (e.g., ["description"])';
COMMENT ON TABLE scene_comments IS 'User comments on published scenes in Community Hub';
