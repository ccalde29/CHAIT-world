# Dual-Database Architecture - Implementation Summary

## 🎯 Overview

CHAIT-World now supports **two deployment modes**:

### 1. **Web Mode** (Traditional)
- All data in Supabase
- Requires internet connection
- Used for web application

### 2. **Local Mode** (New)
- Local data in SQLite (`~/.chait-world/local.db`)
- Community features in Supabase
- Works offline for chat/characters
- Used for desktop/mobile apps

---

## 📁 Files Modified/Created

### Core Services
- ✅ `backend/services/LocalDatabaseService.js` - New SQLite service
- ✅ `backend/services/database.js` - Updated orchestration layer
- ✅ `backend/database/schema.sql` - SQLite schema

### Server
- ✅ `backend/server-supabase.js` - Mode detection & routing

### Configuration
- ✅ `backend/.env.example` - Environment template
- ✅ `backend/package.json` - New scripts

### Testing
- ✅ `backend/test-sqlite.js` - Comprehensive tests

---

## 🚀 Usage

### Environment Setup

Create `.env` file:
```bash
# Deployment mode
DEPLOYMENT_MODE=local   # or 'web'

# Supabase (required for both modes)
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Server
PORT=3001
```

### Running the Server

```bash
# Local mode (SQLite + Supabase community)
npm run start:local
npm run dev:local    # with nodemon

# Web mode (Supabase only)
npm run start:web
npm run dev:web

# Test database
npm run test:db
```

---

## 🗄️ Data Distribution

### SQLite (Local Mode)
**Location:** `~/.chait-world/local.db`

**Tables:**
- `characters` - User's local characters
- `scenarios` - User's local scenes
- `chat_sessions` - All chat sessions
- `messages` - All chat messages
- `character_memories` - Memory system
- `character_relationships` - Relationships
- `character_learning` - Learning patterns
- `character_session_state` - Session states
- `character_topic_engagement` - Topic tracking
- `user_personas` - User personas
- `user_images` - Local image metadata
- `hidden_default_characters` - Hidden prefs
- `response_feedback` - Feedback data
- `custom_models` - Custom AI models
- `user_settings_local` - API keys & preferences
- `character_comments` - Local comments
- `scene_comments` - Local comments

### Supabase (Both Modes)
**Community/Web Data:**
- `auth.users` - Authentication
- `user_settings` - Admin/community prefs
- `community_characters` - Published characters
- `community_scenes` - Published scenes
- `character_comments` - Community comments
- `scene_comments` - Community scene comments
- `character_reports` - Reports
- `community_reports` - General reports
- `character_favorites` - Favorites
- `character_imports` - Import tracking

**Web Mode Also Stores:**
- All local tables (characters, scenarios, chats, etc.)

---

## 🔌 API Methods

### DatabaseService Methods

```javascript
const db = new DatabaseService({ mode: 'local' }); // or 'web'

// Mode detection
db.isLocalMode()           // true/false
db.isWebMode()             // true/false
db.isCommunityAvailable()  // true/false

// Character operations (auto-routed)
await db.createCharacter(userId, data)
await db.getCharacters(userId)
await db.updateCharacter(characterId, updates)
await db.deleteCharacter(characterId)

// Scenario operations (auto-routed)
await db.createScenario(userId, data)
await db.getScenarios(userId)
await db.updateScenario(userId, scenarioId, updates)
await db.deleteScenario(userId, scenarioId)

// Chat operations (auto-routed)
await db.createChatSession(userId, data)
await db.getChatHistory(userId, limit)
await db.saveChatMessage(sessionId, data)
await db.getChatMessages(sessionId, limit)

// Memory operations (auto-routed)
await db.addCharacterMemory(characterId, userId, data)
await db.getCharacterMemories(characterId, userId, limit)
await db.clearCharacterMemories(characterId, userId)

// Relationship operations (auto-routed)
await db.getCharacterRelationship(characterId, userId)
await db.updateCharacterRelationship(characterId, userId, data)

// Community operations (always Supabase)
await db.publishCharacter(userId, characterId, data)
await db.importCharacterFromCommunity(userId, communityCharId)
```

---

## 🧪 Testing

All operations tested and verified:
```bash
npm run test:db
```

**Tests include:**
- ✅ Mode initialization
- ✅ Character CRUD
- ✅ Scenario CRUD  
- ✅ Chat sessions & messages
- ✅ Memory operations
- ✅ Relationship tracking
- ✅ Cleanup verification

---

## 📊 Current Status

### ✅ Completed (Tasks 1-7, 9-10)
- SQLite schema & service
- Database orchestration
- Dual-mode routing
- Character/scenario/chat operations
- Memory & relationship operations
- User settings migration
- Import/publish functionality
- Server mode detection
- Comprehensive testing

### 🔄 Remaining (Tasks 8, 11-13)
8. Update community routes for consistency
11. Offline mode graceful fallbacks
12. Frontend API client updates
13. Data migration scripts

---

## 🎓 Architecture Benefits

### Local Mode
- ✅ Works offline
- ✅ No cloud costs for local data
- ✅ Faster local operations
- ✅ Privacy (data stays local)
- ✅ Community features when online

### Web Mode
- ✅ No client installation
- ✅ Access from anywhere
- ✅ Automatic backups
- ✅ Cross-device sync
- ✅ Existing infrastructure

---

## 🔐 Security Notes

**Local Mode:**
- API keys stored encrypted in local SQLite
- Database file: `~/.chait-world/local.db`
- File permissions handled by OS

**Web Mode:**
- API keys encrypted in Supabase
- RLS policies enforced
- Service role for backend only

---

## 🛠️ Development

### Adding New Local Tables
1. Add to `backend/database/schema.sql`
2. Add CRUD methods to `LocalDatabaseService.js`
3. Add routing in `database.js`
4. Update tests

### Adding New Routes
- Use `db` methods (auto-routes based on mode)
- Check `db.isCommunityAvailable()` for community features
- Handle offline gracefully

---

## 📝 Notes

- **No data loss**: Supabase tables remain intact for web version
- **Seamless switching**: Change `DEPLOYMENT_MODE` in .env
- **Backward compatible**: Web mode works as before
- **Future-proof**: Ready for Electron/React Native packaging

---

## 🎯 Next Steps

1. **Update community routes** for consistency
2. **Add offline fallbacks** for graceful degradation
3. **Update frontend** API client to detect mode
4. **Create migration scripts** for existing users
5. **Package for desktop/mobile** with Electron/React Native
