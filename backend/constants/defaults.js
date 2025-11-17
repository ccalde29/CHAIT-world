/**
 * Default constants used across the application
 * Centralizes magic numbers for easier maintenance
 */

// AI Settings
const AI_DEFAULTS = {
  TEMPERATURE: 0.8,
  MAX_TOKENS: 150,
  CONTEXT_WINDOW: 8000,
  MIN_PERSONALITY_LENGTH: 20,
  MIN_CHARACTER_AGE: 18
};

// Rate Limiting
const RATE_LIMITS = {
  AI_CALLS_PER_MINUTE: 20,
  GENERAL_REQUESTS_PER_MINUTE: 100,
  UPLOADS_PER_MINUTE: 10,
  WINDOW_MS: 60 * 1000 // 1 minute
};

// File Upload
const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100
};

// Chat & Messaging
const CHAT_DEFAULTS = {
  MESSAGE_DELAY_MS: 1200,
  MAX_CONVERSATION_HISTORY: 10,
  MAX_CONVERSATION_HISTORY_WARN: 1000
};

// Default Entities
const DEFAULT_IDS = {
  SCENARIOS: ['coffee-shop', 'study-group', 'party'],
  CHARACTERS: ['maya', 'alex', 'zoe', 'finn']
};

// String Length Limits
const STRING_LIMITS = {
  CHARACTER_NAME_MAX: 50,
  PERSONALITY_MIN: 20,
  PERSONALITY_MAX: 2000,
  SCENE_NAME_MAX: 50,
  SCENE_DESCRIPTION_MAX: 200,
  SCENE_CONTEXT_MAX: 300,
  SCENE_ATMOSPHERE_MAX: 100,
  USER_PERSONA_PERSONALITY_MAX: 500
};

// Memory & Relationships
const MEMORY_DEFAULTS = {
  MIN_IMPORTANCE_SCORE: 0.0,
  MAX_IMPORTANCE_SCORE: 1.0,
  DEFAULT_IMPORTANCE_SCORE: 0.5,
  MEMORY_CONTENT_MIN_LENGTH: 75
};

module.exports = {
  AI_DEFAULTS,
  RATE_LIMITS,
  UPLOAD_LIMITS,
  PAGINATION,
  CHAT_DEFAULTS,
  DEFAULT_IDS,
  STRING_LIMITS,
  MEMORY_DEFAULTS
};
