// ============================================================================
// CHAIT World Backend - Refactored Version
// Modular architecture with separated routes and services
// backend/server-supabase.js
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const DatabaseService = require('./services/database');
const CharacterService = require('./services/characterService');
const CommunityService = require('./services/communityService');
const { generalLimiter } = require('./middleware/rateLimiter');
const { requireOnline, offlineCapable, handleDatabaseError } = require('./middleware/offlineMode');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Determine deployment mode from environment
const deploymentMode = process.env.DEPLOYMENT_MODE || 'web';
console.log(`🚀 Starting server in ${deploymentMode.toUpperCase()} mode`);

// Initialize database service with mode
const db = new DatabaseService({ mode: deploymentMode });

// Initialize character service
// In local mode, this should use the db routing; in web mode, use Supabase directly
let characterService;
if (deploymentMode === 'local') {
  // Create a wrapper that uses db routing
  characterService = {
    supabase: db.supabase, // Keep for community operations
    getCharacters: async (userId) => {
      const characters = await db.getCharacters(userId);
      // Get default characters
      const defaultCharacters = [
        {
          id: 'maya',
          name: 'Maya',
          personality: 'Energetic art student who loves creativity, colors, and seeing the artistic side of everything. Optimistic and playful with a tendency to get excited about visual concepts.',
          avatar: '🎨',
          color: 'from-pink-500 to-purple-500',
          age: 22,
          sex: 'female',
          appearance: 'Bright-eyed with paint-stained fingers, colorful style',
          background: 'Art student with a passion for visual expression',
          response_style: 'playful',
          is_default: true,
          tags: ['creative', 'optimistic', 'artist']
        },
        {
          id: 'alex',
          name: 'Alex',
          personality: 'Thoughtful philosophy major who asks deep questions about human nature, meaning, and existence. Contemplative and curious, often references philosophical concepts.',
          avatar: '🤔',
          color: 'from-blue-500 to-indigo-500',
          age: 24,
          sex: 'non-binary',
          appearance: 'Thoughtful expression, often lost in contemplation',
          background: 'Philosophy student exploring the big questions',
          response_style: 'contemplative',
          is_default: true,
          tags: ['philosophical', 'thoughtful', 'curious']
        },
        {
          id: 'zoe',
          name: 'Zoe',
          personality: 'Sarcastic tech enthusiast with quick wit and dry humor. Knowledgeable about technology and internet culture, slightly cynical but ultimately caring.',
          avatar: '💻',
          color: 'from-green-500 to-teal-500',
          age: 26,
          sex: 'female',
          appearance: 'Sharp eyes, tech gear always nearby',
          background: 'Software developer with a sarcastic edge',
          response_style: 'witty',
          is_default: true,
          tags: ['tech', 'sarcastic', 'witty']
        },
        {
          id: 'finn',
          name: 'Finn',
          personality: 'Laid-back musician who goes with the flow and relates everything back to music, lyrics, or cultural moments. Supportive and chill with a creative soul.',
          avatar: '🎸',
          color: 'from-orange-500 to-red-500',
          age: 23,
          sex: 'male',
          appearance: 'Relaxed demeanor, often has headphones',
          background: 'Musician always finding the rhythm in life',
          response_style: 'chill',
          is_default: true,
          tags: ['music', 'chill', 'creative']
        }
      ];
      return { characters: [...defaultCharacters, ...characters], total: defaultCharacters.length + characters.length };
    },
    getCharacter: (characterId, userId) => db.getCharacter(characterId),
    createCharacter: (userId, characterData) => db.createCharacter(userId, characterData),
    updateCharacter: (userId, characterId, updates) => db.updateCharacter(characterId, updates),
    deleteCharacter: (userId, characterId) => db.deleteCharacter(characterId),
    publishCharacter: (userId, characterId, publishData) => db.publishCharacter(userId, characterId, publishData),
    importCharacter: (userId, communityCharacterId) => db.importCharacterFromCommunity(userId, communityCharacterId)
  };
} else {
  // Web mode: use traditional CharacterService
  characterService = new CharacterService(db.supabase);
}

// Initialize community service (always uses Supabase)
const communityService = new CommunityService(db.supabase);

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
// Ensure custom auth header names are allowed through CORS preflight
app.options('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'user-id', 'x-user-id']
}));

app.use(express.json({ limit: '10mb' }));

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const requireAuth = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// ============================================================================
// IMPORT AND MOUNT ROUTES
// ============================================================================

// Existing routes (keep as-is for backward compatibility)
const providerRoutes = require('./routes/providers');
const groupChatRoutes = require('./routes/group-chat');

// New modular routes
const chatSessionRoutes = require('./routes/chat-sessions')(db);
const characterRoutes = require('./routes/characters')(characterService);
const communityRoutes = require('./routes/community')(communityService, characterService, db);
const userRoutes = require('./routes/user')(db);
const scenarioRoutes = require('./routes/scenarios')(db);
const memoryRoutes = require('./routes/memory')(db);
const imageRoutes = require('./routes/images')(db);
const characterLearningRoutes = require('./routes/characterLearning')(db.supabase);
const characterCommentRoutes = require('./routes/characterComments')(db.supabase);
const sceneCommentRoutes = require('./routes/sceneComments')(db.supabase);
const personasRoutes = require('./routes/personas');
const relationshipsRoutes = require('./routes/relationships');
const moderationRoutes = require('./routes/moderation');
const customModelsRoutes = require('./routes/custom-models');
const pricingRoutes = require('./routes/pricing');

// Mount routes
app.use('/api/providers', providerRoutes);
app.use('/api/chat', groupChatRoutes);
app.use('/api/chat', requireAuth, chatSessionRoutes);
app.use('/api/characters', requireAuth, characterRoutes);
// Community routes - always require online connection for mutations
app.use('/api/community', (req, res, next) => {
  if (req.method === 'GET') {
    return next(); // Public access for browsing (but still needs online)
  }
  return requireAuth(req, res, next); // Auth required for mutations
});
app.use('/api/community', requireOnline, communityRoutes);

// Other routes - mark offline-capable routes
app.use('/api/characters', requireAuth, communityRoutes); // For publish/unpublish (needs online)
app.use('/api/user', requireAuth, userRoutes);
app.use('/api/scenarios', requireAuth, offlineCapable, scenarioRoutes); // Offline-capable
app.use('/api/character', requireAuth, offlineCapable, memoryRoutes); // Offline-capable
app.use('/api/learning', requireAuth, offlineCapable, characterLearningRoutes); // Offline-capable
app.use('/api/character-comments', requireAuth, characterCommentRoutes); // Needs online
app.use('/api/scene-comments', requireAuth, sceneCommentRoutes); // Needs online
app.use('/api/personas', requireAuth, offlineCapable, personasRoutes); // Offline-capable
app.use('/api/characters', requireAuth, offlineCapable, relationshipsRoutes); // Offline-capable
app.use('/api/moderation', requireAuth, moderationRoutes); // Admin-only, needs online
app.use('/api/custom-models', requireAuth, offlineCapable, customModelsRoutes); // Offline-capable
app.use('/api/pricing', requireAuth, pricingRoutes); // Needs online
// Image routes last since they use catch-all patterns
app.use('/api', requireAuth, offlineCapable, imageRoutes); // Offline-capable

// ============================================================================
// HEALTH & UTILITY ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  const mode = process.env.DEPLOYMENT_MODE || 'web';
  const isLocal = mode === 'local';
  const communityAvailable = !isLocal || (db && db.isCommunityAvailable && db.isCommunityAvailable());
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    mode: mode,
    database: isLocal ? 'SQLite + Supabase (community)' : 'Supabase',
    offline: !communityAvailable,
    features: {
      chatHistory: true,
      characterMemory: true,
      characterInteractions: true,
      modularArchitecture: true,
      offlineMode: isLocal,
      communityFeatures: communityAvailable
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Database error handler (must be before generic error handler)
app.use(handleDatabaseError);

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`
🚀 CHAIT World Server Started
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🗄️  Database: Supabase
🔐 Auth: Google OAuth
✨ Features:
   ✓ Character-to-Character Interactions
   ✓ Memory & Learning System
   ✓ Chat History & Sessions
   ✓ Custom Characters & Scenes
   ✓ Community Hub
   ✓ Image Uploads
   ✓ Modular Architecture
  `);
});

module.exports = app;
