-- Migration: Rename 'context' column to 'initial_message' in scenarios table
-- This aligns the database with the frontend terminology where each scene has an initial message

-- Rename the column
ALTER TABLE scenarios RENAME COLUMN context TO initial_message;

-- Update the constraint name to match
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS context_length;
ALTER TABLE scenarios ADD CONSTRAINT initial_message_length CHECK ((length(initial_message) >= 1) AND (length(initial_message) <= 500));

-- Add comment explaining the column purpose
COMMENT ON COLUMN scenarios.initial_message IS 'The message shown at the start of every chat in this scene. Sets the atmosphere and provides context for the conversation.';
