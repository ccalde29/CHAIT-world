-- ============================================================================
-- Schema Enhancements for Consistency Improvements
-- Adds structured voice traits, scene context rules, and session metadata
-- ============================================================================

-- Add voice traits and speech patterns to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS voice_traits JSONB DEFAULT '{
  "formality": 0.5,
  "verbosity": 0.5,
  "emotiveness": 0.5,
  "humor": 0.5,
  "directness": 0.5,
  "optimism": 0.5,
  "intellectualism": 0.5
}'::jsonb,
ADD COLUMN IF NOT EXISTS speech_patterns JSONB DEFAULT '{
  "favored_phrases": [],
  "avoided_words": [],
  "typical_sentence_length": "medium",
  "uses_contractions": true,
  "uses_slang": false,
  "punctuation_style": "casual"
}'::jsonb;

-- Add context rules and state to scenarios table
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS context_rules JSONB DEFAULT '{
  "setting_type": "casual",
  "time_of_day": "afternoon",
  "noise_level": 0.5,
  "formality_required": 0.3,
  "allowed_topics": [],
  "restricted_topics": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS scene_state JSONB DEFAULT '{
  "crowd_level": "moderate",
  "active_npcs": [],
  "recent_events": [],
  "ambient_details": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS character_modifiers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS scene_cues JSONB DEFAULT '[]'::jsonb;

-- Add metadata to chat_sessions for continuity tracking
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
  "tone": "neutral",
  "key_topics": [],
  "significant_moments": [],
  "avg_message_length": 0
}'::jsonb;

-- Add response metadata to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_primary_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_metadata JSONB DEFAULT '{
  "temperature_used": 0.8,
  "tokens_used": 0,
  "provider": "",
  "model": ""
}'::jsonb;

-- Create index on voice_traits for faster queries
CREATE INDEX IF NOT EXISTS idx_characters_voice_traits ON characters USING GIN (voice_traits);

-- Create index on context_rules for scene queries
CREATE INDEX IF NOT EXISTS idx_scenarios_context_rules ON scenarios USING GIN (context_rules);

-- Create index on session metadata
CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata ON chat_sessions USING GIN (metadata);

-- Comment the new columns
COMMENT ON COLUMN characters.voice_traits IS 'Structured personality traits for consistent voice (formality, verbosity, emotiveness, etc.)';
COMMENT ON COLUMN characters.speech_patterns IS 'Speech patterns and preferences (phrases, contractions, slang usage)';
COMMENT ON COLUMN scenarios.context_rules IS 'Scene context rules (formality, noise level, allowed topics)';
COMMENT ON COLUMN scenarios.scene_state IS 'Dynamic scene state (crowd level, NPCs, events)';
COMMENT ON COLUMN scenarios.character_modifiers IS 'Character-specific instructions for this scene';
COMMENT ON COLUMN scenarios.scene_cues IS 'Recurring scene messages or triggers';
COMMENT ON COLUMN chat_sessions.metadata IS 'Session metadata for continuity (tone, topics, moments)';
COMMENT ON COLUMN messages.is_primary_response IS 'Whether this was the primary responding character';
COMMENT ON COLUMN messages.response_metadata IS 'Metadata about how the response was generated';
