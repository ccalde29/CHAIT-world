-- Migration: Add active_persona_id to user_settings and enhance bot-to-bot relationships
-- Created: 2025-12-06

-- ============================================================================
-- 1. Add active_persona_id to user_settings
-- ============================================================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS active_persona_id INTEGER
REFERENCES user_personas(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_active_persona
ON user_settings(active_persona_id);

-- Add comment
COMMENT ON COLUMN user_settings.active_persona_id IS 'The currently active persona for this user';

-- ============================================================================
-- 2. Add custom_context to character_relationships for bot-to-bot relationships
-- ============================================================================

ALTER TABLE character_relationships
ADD COLUMN IF NOT EXISTS custom_context TEXT;

-- Add comment
COMMENT ON COLUMN character_relationships.custom_context IS 'Custom description of the relationship (e.g., "We grew up together", "Met in college")';

-- ============================================================================
-- 3. Update character_relationships comment to reflect bot-to-bot support
-- ============================================================================

COMMENT ON TABLE character_relationships IS 'Tracks relationships between characters and users, or between characters themselves (bot-to-bot)';

-- ============================================================================
-- 4. Create function to get bot-to-bot relationships
-- ============================================================================

CREATE OR REPLACE FUNCTION get_character_relationships(
  p_character_id TEXT,
  p_user_id UUID,
  p_target_type TEXT DEFAULT 'character'
)
RETURNS TABLE (
  id INTEGER,
  character_id VARCHAR(50),
  target_type VARCHAR(20),
  target_id VARCHAR(100),
  relationship_type VARCHAR(30),
  trust_level DOUBLE PRECISION,
  familiarity_level DOUBLE PRECISION,
  emotional_bond DOUBLE PRECISION,
  custom_context TEXT,
  last_interaction TIMESTAMP WITH TIME ZONE,
  interaction_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.character_id,
    cr.target_type,
    cr.target_id,
    cr.relationship_type,
    cr.trust_level,
    cr.familiarity_level,
    cr.emotional_bond,
    cr.custom_context,
    cr.last_interaction,
    cr.interaction_count,
    cr.created_at
  FROM character_relationships cr
  WHERE cr.character_id = p_character_id
    AND cr.user_id = p_user_id
    AND cr.target_type = p_target_type;
END;
$$;

-- ============================================================================
-- 5. Create function to upsert bot-to-bot relationships
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_bot_relationship(
  p_character_id TEXT,
  p_user_id UUID,
  p_target_character_id TEXT,
  p_relationship_type VARCHAR(30),
  p_trust_level DOUBLE PRECISION,
  p_familiarity_level DOUBLE PRECISION,
  p_emotional_bond DOUBLE PRECISION,
  p_custom_context TEXT DEFAULT NULL
)
RETURNS character_relationships
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result character_relationships;
BEGIN
  INSERT INTO character_relationships (
    character_id,
    user_id,
    target_type,
    target_id,
    relationship_type,
    trust_level,
    familiarity_level,
    emotional_bond,
    custom_context,
    interaction_count
  )
  VALUES (
    p_character_id,
    p_user_id,
    'character',
    p_target_character_id,
    p_relationship_type,
    p_trust_level,
    p_familiarity_level,
    p_emotional_bond,
    p_custom_context,
    1
  )
  ON CONFLICT (character_id, user_id, target_type, target_id)
  DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    trust_level = EXCLUDED.trust_level,
    familiarity_level = EXCLUDED.familiarity_level,
    emotional_bond = EXCLUDED.emotional_bond,
    custom_context = EXCLUDED.custom_context,
    last_interaction = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_character_relationships(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_bot_relationship(TEXT, UUID, TEXT, VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
