-- SQLite Local Database Schema for CHAIT-World
-- This database stores all local/offline data: characters, scenarios, chats, memories, etc.
-- Community data remains in Supabase

-- =============================================================================
-- CHARACTERS TABLE - Local character storage
-- =============================================================================
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT, -- Local user identifier (not UUID for offline support)
    name TEXT NOT NULL CHECK(length(name) >= 1 AND length(name) <= 50),
    personality TEXT NOT NULL CHECK(length(personality) >= 20 AND length(personality) <= 500),
    avatar TEXT DEFAULT '🤖',
    color TEXT DEFAULT 'from-gray-500 to-slate-500',
    response_style TEXT DEFAULT 'custom',
    is_default INTEGER DEFAULT 0,
    is_modified_default INTEGER DEFAULT 0,
    original_id TEXT, -- Reference to original default character
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar_image_url TEXT,
    avatar_image_filename TEXT,
    uses_custom_image INTEGER DEFAULT 0,
    age INTEGER DEFAULT 18 NOT NULL CHECK(age >= 18),
    sex TEXT,
    appearance TEXT,
    background TEXT,
    chat_examples TEXT, -- JSON string
    relationships TEXT, -- JSON string
    tags TEXT, -- JSON array string
    temperature REAL DEFAULT 0.7 CHECK(temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 150 CHECK(max_tokens >= 50 AND max_tokens <= 1000),
    context_window INTEGER DEFAULT 8000 CHECK(context_window >= 1000 AND context_window <= 32000),
    memory_enabled INTEGER DEFAULT 1,
    ai_provider TEXT DEFAULT 'openai',
    ai_model TEXT DEFAULT 'gpt-3.5-turbo',
    fallback_provider TEXT,
    fallback_model TEXT,
    voice_traits TEXT DEFAULT '{"humor": 0.5, "optimism": 0.5, "formality": 0.5, "verbosity": 0.5, "directness": 0.5, "emotiveness": 0.5, "intellectualism": 0.5}', -- JSON string
    speech_patterns TEXT DEFAULT '{"uses_slang": false, "avoided_words": [], "favored_phrases": [], "punctuation_style": "casual", "uses_contractions": true, "typical_sentence_length": "medium"}' -- JSON string
);

CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_created ON characters(created_at);
CREATE INDEX idx_characters_is_default ON characters(is_default);

-- =============================================================================
-- SCENARIOS TABLE - Local scene/scenario storage
-- =============================================================================
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    name TEXT NOT NULL CHECK(length(name) >= 1 AND length(name) <= 50),
    description TEXT NOT NULL CHECK(length(description) >= 1 AND length(description) <= 200),
    initial_message TEXT NOT NULL CHECK(length(initial_message) >= 1 AND length(initial_message) <= 500),
    atmosphere TEXT DEFAULT 'neutral',
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    background_image_url TEXT,
    background_image_filename TEXT,
    uses_custom_background INTEGER DEFAULT 0,
    narrator_enabled INTEGER DEFAULT 0,
    narrator_ai_provider TEXT DEFAULT 'openai',
    narrator_ai_model TEXT,
    narrator_temperature REAL DEFAULT 0.7,
    narrator_max_tokens INTEGER DEFAULT 100,
    narrator_trigger_mode TEXT DEFAULT 'manual',
    narrator_interval INTEGER DEFAULT 5,
    narrator_personality TEXT,
    context_rules TEXT DEFAULT '{"noise_level": 0.5, "time_of_day": "afternoon", "setting_type": "casual", "allowed_topics": [], "restricted_topics": [], "formality_required": 0.3}', -- JSON
    scene_state TEXT DEFAULT '{"active_npcs": [], "crowd_level": "moderate", "recent_events": [], "ambient_details": []}', -- JSON
    character_modifiers TEXT DEFAULT '{}', -- JSON
    scene_cues TEXT DEFAULT '[]' -- JSON
);

CREATE INDEX idx_scenarios_user ON scenarios(user_id);
CREATE INDEX idx_scenarios_created ON scenarios(created_at);
CREATE INDEX idx_scenarios_is_default ON scenarios(is_default);

-- =============================================================================
-- CHAT SESSIONS TABLE - All chat sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    title TEXT,
    scenario_id TEXT,
    active_characters TEXT, -- JSON array
    group_mode TEXT DEFAULT 'natural',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived INTEGER DEFAULT 0,
    last_message_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{"tone": "neutral", "key_topics": [], "avg_message_length": 0, "significant_moments": []}', -- JSON
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity);
CREATE INDEX idx_chat_sessions_scenario ON chat_sessions(scenario_id);

-- =============================================================================
-- MESSAGES TABLE - All chat messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sender_type TEXT CHECK(sender_type IN ('user', 'character', 'system', 'narrator')),
    sender_id TEXT,
    content TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    character_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    mood_at_time TEXT,
    mood_intensity REAL CHECK(mood_intensity >= 0 AND mood_intensity <= 1),
    is_primary_response INTEGER DEFAULT 0,
    response_metadata TEXT DEFAULT '{"model": "", "provider": "", "tokens_used": 0, "temperature_used": 0.8}', -- JSON
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_character ON messages(character_id);

-- =============================================================================
-- CHARACTER MEMORIES TABLE - Memory system
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_memories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    user_id TEXT,
    memory_type TEXT DEFAULT 'episodic' CHECK(memory_type IN ('episodic', 'semantic', 'emotional', 'relational')),
    content TEXT NOT NULL,
    importance_score REAL DEFAULT 0.5 CHECK(importance_score >= 0 AND importance_score <= 1),
    emotional_valence REAL DEFAULT 0.0 CHECK(emotional_valence >= -1 AND emotional_valence <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    related_session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    embedding_hash TEXT,
    tags TEXT, -- JSON array
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (related_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_memories_character ON character_memories(character_id);
CREATE INDEX idx_memories_user ON character_memories(user_id);
CREATE INDEX idx_memories_type ON character_memories(memory_type);
CREATE INDEX idx_memories_importance ON character_memories(importance_score);
CREATE INDEX idx_memories_last_accessed ON character_memories(last_accessed);

-- =============================================================================
-- CHARACTER RELATIONSHIPS TABLE - Relationship tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    user_id TEXT,
    target_type TEXT CHECK(target_type IN ('character', 'user', 'persona')),
    target_id TEXT,
    relationship_type TEXT DEFAULT 'neutral',
    trust_level REAL DEFAULT 0.5 CHECK(trust_level >= 0 AND trust_level <= 1),
    familiarity_level REAL DEFAULT 0.1 CHECK(familiarity_level >= 0 AND familiarity_level <= 1),
    emotional_bond REAL DEFAULT 0.0 CHECK(emotional_bond >= -1 AND emotional_bond <= 1),
    last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    interaction_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    custom_context TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, target_type, target_id)
);

CREATE INDEX idx_relationships_character ON character_relationships(character_id);
CREATE INDEX idx_relationships_user ON character_relationships(user_id);
CREATE INDEX idx_relationships_target ON character_relationships(target_type, target_id);

-- =============================================================================
-- CHARACTER LEARNING TABLE - Learning patterns
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    learning_type TEXT CHECK(learning_type IN ('communication_style', 'topic_preference', 'emotional_response', 'humor_style')),
    pattern_data TEXT NOT NULL, -- JSON
    confidence_score REAL DEFAULT 0.5 CHECK(confidence_score >= 0 AND confidence_score <= 1),
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, learning_type)
);

CREATE INDEX idx_learning_character ON character_learning(character_id);
CREATE INDEX idx_learning_type ON character_learning(learning_type);

-- =============================================================================
-- CHARACTER SESSION STATE TABLE - Per-session state
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_session_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id TEXT,
    current_mood TEXT DEFAULT 'neutral',
    mood_intensity REAL DEFAULT 0.5 CHECK(mood_intensity >= 0 AND mood_intensity <= 1),
    energy_level REAL DEFAULT 0.7 CHECK(energy_level >= 0 AND energy_level <= 1),
    engagement_score REAL DEFAULT 0.5 CHECK(engagement_score >= 0 AND engagement_score <= 1),
    active_topics TEXT, -- JSON array
    conversation_context TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    UNIQUE(character_id, session_id, user_id)
);

CREATE INDEX idx_session_state_character ON character_session_state(character_id);
CREATE INDEX idx_session_state_session ON character_session_state(session_id);

-- =============================================================================
-- CHARACTER TOPIC ENGAGEMENT TABLE - Topic tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_topic_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    interest_level REAL DEFAULT 0.5 CHECK(interest_level >= 0 AND interest_level <= 1),
    times_discussed INTEGER DEFAULT 1,
    last_discussed DATETIME DEFAULT CURRENT_TIMESTAMP,
    emotional_association REAL DEFAULT 0.0 CHECK(emotional_association >= -1 AND emotional_association <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, topic)
);

CREATE INDEX idx_topic_engagement_character ON character_topic_engagement(character_id);
CREATE INDEX idx_topic_engagement_interest ON character_topic_engagement(interest_level);

-- =============================================================================
-- USER PERSONAS TABLE - User personas
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_personas (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personas_user ON user_personas(user_id);
CREATE INDEX idx_personas_active ON user_personas(is_active);

-- =============================================================================
-- USER IMAGES TABLE - Local image storage
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_images (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    image_type TEXT CHECK(image_type IN ('avatar', 'background', 'other')),
    associated_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_user ON user_images(user_id);
CREATE INDEX idx_images_type ON user_images(image_type);
CREATE INDEX idx_images_associated ON user_images(associated_id);

-- =============================================================================
-- HIDDEN DEFAULT CHARACTERS TABLE - Hidden characters preferences
-- =============================================================================
CREATE TABLE IF NOT EXISTS hidden_default_characters (
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    hidden_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, character_id)
);

CREATE INDEX idx_hidden_user ON hidden_default_characters(user_id);

-- =============================================================================
-- RESPONSE FEEDBACK TABLE - Feedback on AI responses
-- =============================================================================
CREATE TABLE IF NOT EXISTS response_feedback (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    session_id TEXT,
    message_id INTEGER,
    user_id TEXT,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback_type TEXT,
    feedback_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_feedback_character ON response_feedback(character_id);
CREATE INDEX idx_feedback_session ON response_feedback(session_id);
CREATE INDEX idx_feedback_rating ON response_feedback(rating);

-- =============================================================================
-- CUSTOM MODELS TABLE - Custom AI model configurations
-- =============================================================================
CREATE TABLE IF NOT EXISTS custom_models (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT, -- Local user (can be NULL for globally available models)
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    provider TEXT NOT NULL, -- 'openrouter', 'ollama', 'lmstudio', etc.
    model_id TEXT NOT NULL, -- Actual model identifier
    custom_system_prompt TEXT,
    temperature REAL DEFAULT 0.8 CHECK(temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 150 CHECK(max_tokens >= 50 AND max_tokens <= 1000),
    is_active INTEGER DEFAULT 1,
    tags TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_models_user ON custom_models(user_id);
CREATE INDEX idx_custom_models_provider ON custom_models(provider);
CREATE INDEX idx_custom_models_active ON custom_models(is_active);

-- =============================================================================
-- USER SETTINGS LOCAL TABLE - Local user preferences & API keys
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_settings_local (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT UNIQUE, -- Can be NULL for offline-only mode
    api_keys TEXT, -- JSON encrypted blob: {openai, anthropic, openrouter, google}
    ollama_settings TEXT DEFAULT '{"baseUrl": "http://localhost:11434", "models": []}', -- JSON
    lmstudio_settings TEXT DEFAULT '{"baseUrl": "http://localhost:1234", "models": []}', -- JSON
    default_provider TEXT DEFAULT 'openai',
    default_model TEXT,
    active_persona_id TEXT,
    is_admin INTEGER DEFAULT 0,
    auto_approve_characters INTEGER DEFAULT 0,
    admin_system_prompt TEXT,
    group_dynamics_mode TEXT DEFAULT 'natural',
    message_delay INTEGER DEFAULT 1200,
    preferences TEXT DEFAULT '{"responseDelay": true, "showTypingIndicator": true, "maxCharactersInGroup": 5, "theme": "dark", "fontSize": "medium"}', -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_persona_id) REFERENCES user_personas(id) ON DELETE SET NULL
);

CREATE INDEX idx_settings_user ON user_settings_local(user_id);

-- =============================================================================
-- CHARACTER COMMENTS TABLE (LOCAL) - Comments on local characters (not community)
-- =============================================================================
CREATE TABLE IF NOT EXISTS character_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    user_id TEXT,
    content TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX idx_character_comments_character ON character_comments(character_id);
CREATE INDEX idx_character_comments_user ON character_comments(user_id);

-- =============================================================================
-- SCENE COMMENTS TABLE (LOCAL) - Comments on local scenarios
-- =============================================================================
CREATE TABLE IF NOT EXISTS scene_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    scenario_id TEXT NOT NULL,
    user_id TEXT,
    content TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_scene_comments_scenario ON scene_comments(scenario_id);
CREATE INDEX idx_scene_comments_user ON scene_comments(user_id);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================================================

CREATE TRIGGER update_characters_timestamp 
AFTER UPDATE ON characters 
BEGIN
    UPDATE characters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_scenarios_timestamp 
AFTER UPDATE ON scenarios 
BEGIN
    UPDATE scenarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_chat_sessions_timestamp 
AFTER UPDATE ON chat_sessions 
BEGIN
    UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_character_memories_timestamp 
AFTER UPDATE ON character_memories 
BEGIN
    UPDATE character_memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_character_learning_timestamp 
AFTER UPDATE ON character_learning 
BEGIN
    UPDATE character_learning SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_character_session_state_timestamp 
AFTER UPDATE ON character_session_state 
BEGIN
    UPDATE character_session_state SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_user_personas_timestamp 
AFTER UPDATE ON user_personas 
BEGIN
    UPDATE user_personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_custom_models_timestamp 
AFTER UPDATE ON custom_models 
BEGIN
    UPDATE custom_models SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_user_settings_local_timestamp 
AFTER UPDATE ON user_settings_local 
BEGIN
    UPDATE user_settings_local SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_character_comments_timestamp 
AFTER UPDATE ON character_comments 
BEGIN
    UPDATE character_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_scene_comments_timestamp 
AFTER UPDATE ON scene_comments 
BEGIN
    UPDATE scene_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================================================
-- TOKEN SYSTEM TABLES
-- =============================================================================

-- User token balances
CREATE TABLE IF NOT EXISTS user_tokens (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 100,
    lifetime_earned INTEGER DEFAULT 100,
    lifetime_purchased INTEGER DEFAULT 0,
    last_weekly_refill DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_tokens_balance ON user_tokens(balance);
CREATE INDEX idx_user_tokens_refill ON user_tokens(last_weekly_refill);

-- Token transaction history
CREATE TABLE IF NOT EXISTS token_transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('weekly_refill', 'purchase', 'admin_grant', 'admin_deduct', 'usage')),
    reference TEXT,
    balance_after INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_tokens(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(type);
CREATE INDEX idx_token_transactions_created ON token_transactions(created_at);

-- Token Models (renamed from custom_models)
CREATE TABLE IF NOT EXISTS token_models (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    ai_provider TEXT NOT NULL CHECK(ai_provider IN ('openai', 'anthropic', 'google', 'openrouter')),
    model_id TEXT NOT NULL,
    token_cost INTEGER NOT NULL DEFAULT 1 CHECK(token_cost >= 0),
    custom_system_prompt TEXT,
    temperature REAL DEFAULT 0.7 CHECK(temperature >= 0 AND temperature <= 2.0),
    max_tokens INTEGER DEFAULT 150 CHECK(max_tokens >= 50 AND max_tokens <= 1000),
    tags TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_models_active ON token_models(is_active);
CREATE INDEX idx_token_models_provider ON token_models(ai_provider);
CREATE INDEX idx_token_models_cost ON token_models(token_cost);

-- =============================================================================
-- ADMIN API CREDENTIALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    openai_key TEXT,
    anthropic_key TEXT,
    google_key TEXT,
    openrouter_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_api_keys_user ON admin_api_keys(user_id);

CREATE TRIGGER update_token_models_timestamp 
AFTER UPDATE ON token_models 
BEGIN
    UPDATE token_models SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_admin_api_keys_timestamp 
AFTER UPDATE ON admin_api_keys 
BEGIN
    UPDATE admin_api_keys SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER update_user_tokens_timestamp 
AFTER UPDATE ON user_tokens 
BEGIN
    UPDATE user_tokens SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

-- =============================================================================
-- DATABASE VERSION TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version) VALUES (1);
