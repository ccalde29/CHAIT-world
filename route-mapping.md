# Route Mapping Verification

## Backend Routes (Actual)

### Chat Routes (`/api/chat/*`)
- POST `/api/chat/group-response` - Send message and get AI responses (with rate limiting)
- POST `/api/chat/sessions` - Create chat session
- GET `/api/chat/sessions` - Get all sessions
- GET `/api/chat/sessions/:sessionId` - Get specific session
- PUT `/api/chat/sessions/:sessionId` - Update session
- DELETE `/api/chat/sessions/:sessionId` - Delete session

### Character Routes (`/api/characters/*`)
- GET `/api/characters` - Get all characters
- POST `/api/characters` - Create character
- PUT `/api/characters/:id` - Update character
- DELETE `/api/characters/:id` - Delete character
- PUT `/api/characters/:id/image` - Update character image (with upload rate limiting)

### Community Routes (`/api/community/*` & `/api/characters/*`)
- GET `/api/community/characters` - Browse community characters
- GET `/api/community/tags` - Get available tags
- POST `/api/community/characters/:id/import` - Import character
- POST `/api/community/characters/:id/view` - Increment view count
- POST `/api/characters/publish/:id` - Publish character
- POST `/api/characters/unpublish/:id` - Unpublish character
- POST `/api/community/characters/:id/favorite` - Favorite character
- DELETE `/api/community/characters/:id/favorite` - Unfavorite character
- GET `/api/community/favorites` - Get user's favorites
- POST `/api/community/characters/:id/report` - Report character

### User Routes (`/api/user/*`)
- GET `/api/user/settings` - Get user settings
- PUT `/api/user/settings` - Update user settings
- GET `/api/user/persona` - Get user persona
- POST `/api/user/persona` - Create/update user persona
- DELETE `/api/user/persona` - Delete user persona
- PUT `/api/user/persona/image` - Update persona image (with upload rate limiting)

### Scenario Routes (`/api/scenarios/*`)
- GET `/api/scenarios` - Get all scenarios
- POST `/api/scenarios` - Create scenario
- PUT `/api/scenarios/:id` - Update scenario
- DELETE `/api/scenarios/:id` - Delete scenario
- PUT `/api/scenarios/:id/image` - Update scenario image (with upload rate limiting)

### Memory Routes (`/api/character/*`)
- GET `/api/character/:characterId/memories` - Get character memories
- GET `/api/character/:characterId/relationship` - Get character relationship
- DELETE `/api/character/:characterId/memories` - Clear character memories

### Provider Routes (`/api/providers/*`)
- POST `/api/providers/test` - Test AI provider
- POST `/api/providers/models` - Get available models
- POST `/api/providers/ollama/models` - Get Ollama models

### Image Routes (`/api/*`)
- DELETE `/api/:type/:filename` - Delete uploaded image

## Frontend API Calls (Actual)

### From Hooks
- `useChat.js:52` - POST `/api/chat/group-response` ✅
- `useChat.js:103` - GET `/api/chat/sessions/:sessionId` ✅
- `useCharacters.js:24` - GET `/api/characters` ✅
- `useCharacters.js:38` - GET `/api/scenarios` ✅
- `useSettings.js:25` - GET `/api/user/settings` ✅
- `useSettings.js:35` - GET `/api/user/persona` ✅
- `useSettings.js:55` - PUT `/api/user/settings` ✅
- `useSettings.js:75` - POST `/api/user/persona` ✅

### From Components
- `MainApp.js:84` - POST `/api/characters` ✅
- `MainApp.js:295` - POST `/api/scenarios` ✅
- `CommunityHub.js:77` - GET `/api/community/tags` ✅
- `ChatHistorySidebar.js:38` - GET `/api/chat/sessions` ✅

## Status: ✅ ALL ROUTES VERIFIED

All frontend API calls match backend routes correctly!

## Rate Limiting Applied
- General API: 100 requests/minute (all `/api/*` routes)
- AI Calls: 20 requests/minute (`/api/chat/group-response`)
- Uploads: 10 requests/minute (all image upload routes)

