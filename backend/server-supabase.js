// ============================================================================
// CHAIT World Backend - Refactored Version
// Modular architecture with separated routes and services
// backend/server-supabase.js
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const DatabaseService = require('./services/database');
const CommunityService = require('./services/communityService');
const { generalLimiter } = require('./middleware/rateLimiter');
const { requireOnline, offlineCapable, handleDatabaseError } = require('./middleware/offlineMode');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Initialize database service (always local mode with Supabase for community)
const db = new DatabaseService();

// Initialize character service - always use local db routing
const characterService = {
  supabase: db.supabase, // Keep for community operations
  getCharacters: async (userId) => {
    const characters = await db.getCharacters(userId);
    return { characters, total: characters.length };
  },
  getCharacter: (characterId, userId) => db.getCharacter(characterId),
  createCharacter: (userId, characterData) => db.createCharacter(userId, characterData),
  updateCharacter: (userId, characterId, updates) => db.updateCharacter(characterId, updates),
  deleteCharacter: (userId, characterId) => db.deleteCharacter(characterId),
  publishCharacter: (userId, characterId, publishData) => db.publishCharacter(userId, characterId, publishData),
  importCharacter: (userId, communityCharacterId) => db.importCharacterFromCommunity(userId, communityCharacterId)
};

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

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

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
const groupChatRoutes = require('./routes/group-chat')(db);

// New modular routes
const chatSessionRoutes = require('./routes/chat-sessions')(db);
const characterRoutes = require('./routes/characters')(characterService);
const communityRoutes = require('./routes/community')(communityService, characterService, db);
const userRoutes = require('./routes/user')(db);
const scenarioRoutes = require('./routes/scenarios')(db);
const memoryRoutes = require('./routes/memory')(db);
const imageRoutes = require('./routes/images')(db);
const characterLearningRoutes = require('./routes/characterLearning')(db);
const characterCommentRoutes = require('./routes/characterComments')(db.supabase);
const sceneCommentRoutes = require('./routes/sceneComments')(db.supabase);
const personasRoutes = require('./routes/personas')(db);
const relationshipsRoutes = require('./routes/relationships')(db);
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
// Image routes
app.use('/api/images', requireAuth, offlineCapable, imageRoutes); // Offline-capable

// ============================================================================
// HEALTH & UTILITY ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  const communityAvailable = db && db.isCommunityAvailable && db.isCommunityAvailable();
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    mode: 'local',
    database: 'SQLite (local) + Supabase (community)',
    offline: !communityAvailable,
    features: {
      chatHistory: true,
      characterMemory: true,
      characterInteractions: true,
      modularArchitecture: true,
      offlineMode: true,
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
