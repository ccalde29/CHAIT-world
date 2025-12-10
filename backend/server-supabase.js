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
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

const db = new DatabaseService();
const characterService = new CharacterService(db.supabase);
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
const communityRoutes = require('./routes/community')(communityService, characterService);
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
// Community routes - GET requests are public, POST/PUT/DELETE require auth
app.use('/api/community', (req, res, next) => {
  if (req.method === 'GET') {
    return next(); // Public access for browsing
  }
  return requireAuth(req, res, next); // Auth required for mutations
});
app.use('/api/community', communityRoutes);
app.use('/api/characters', requireAuth, communityRoutes); // For publish/unpublish
app.use('/api/user', requireAuth, userRoutes);
app.use('/api/scenarios', requireAuth, scenarioRoutes);
app.use('/api/character', requireAuth, memoryRoutes);
app.use('/api/learning', requireAuth, characterLearningRoutes);
app.use('/api/character-comments', requireAuth, characterCommentRoutes);
app.use('/api/scene-comments', requireAuth, sceneCommentRoutes);
app.use('/api/personas', requireAuth, personasRoutes);
app.use('/api/characters', requireAuth, relationshipsRoutes);
app.use('/api/moderation', requireAuth, moderationRoutes); // Admin-only routes (middleware checks inside)
app.use('/api/custom-models', requireAuth, customModelsRoutes);
app.use('/api/pricing', requireAuth, pricingRoutes);
// Image routes last since they use catch-all patterns
app.use('/api', requireAuth, imageRoutes);

// ============================================================================
// HEALTH & UTILITY ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'Supabase',
    features: {
      chatHistory: true,
      characterMemory: true,
      characterInteractions: true,
      modularArchitecture: true
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

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
