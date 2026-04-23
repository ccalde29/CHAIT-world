# CHAIT World — API Reference

> **Base URL:** `http://localhost:3001`
> All `/api/*` routes are subject to general rate limiting.

---

## Authentication

The backend uses a simple header-based auth scheme — no JWT.

| Header | Value | Used by |
|---|---|---|
| `user-id` | Supabase `user.id` | All `requireAuth` routes |

Two middleware levels:

- **`requireAuth`** — request must include `user-id` header; sets `req.userId`
- **`requireAdmin`** — `requireAuth` + Supabase `admin_users` table check via `adminAuth.js`

Community `GET` routes are **public** (no header required). Community mutation routes (`POST`, `DELETE`, `PUT`) require `requireAuth`.

---

## Static Assets

| Path | Description |
|---|---|
| `GET /uploads/:type/:filename` | Serve uploaded images from `data/uploads/` — no auth |

---

## Health

### `GET /health`

No auth required.

**Response**
```json
{
  "status": "OK",
  "timestamp": "ISO string",
  "version": "2.0.0",
  "environment": "development",
  "mode": "local",
  "database": "SQLite (local) + Supabase (community)",
  "features": {
    "chatHistory": true,
    "characterMemory": true,
    "characterInteractions": true,
    "modularArchitecture": true,
    "communityFeatures": true
  }
}
```

---

## AI Providers — `/api/providers`

No auth required on any provider route.

### `POST /api/providers/test`

Test whether an API key or local server connection works.

**Body**
```json
{
  "provider": "openai | anthropic | google | openrouter | ollama | lmstudio",
  "apiKey": "string (omit for ollama/lmstudio)",
  "ollamaSettings": { "baseUrl": "http://localhost:11434" },
  "model": "string (optional — model to use for test prompt)"
}
```

**Response**
```json
{ "success": true, "message": "string" }
```

---

### `POST /api/providers/models`

Fetch available models for a provider.

**Body**
```json
{
  "provider": "openai | anthropic | google | openrouter | ollama | lmstudio",
  "apiKey": "string",
  "ollamaSettings": { "baseUrl": "string" },
  "lmStudioSettings": { "baseUrl": "string" }
}
```

**Response**
```json
{ "models": [{ "id": "string", "name": "string" }] }
```

---

### `GET /api/providers/ollama/models`

List locally installed Ollama models.

**Query params:** `baseUrl` (default: `http://localhost:11434`)

**Response**
```json
{ "models": ["model-name"] }
```

---

### `GET /api/providers/list`

Static list of supported AI providers.

**Response**
```json
{ "providers": ["openai", "anthropic", "google", "openrouter", "ollama", "lmstudio", "custom"] }
```

---

### `GET /api/providers/defaults`

Static default model suggestions per provider.

**Response**
```json
{ "defaults": { "openai": "gpt-4o", "anthropic": "claude-3-5-sonnet-20241022", ... } }
```

---

## Group Chat — `POST /api/chat/group`

The main chat endpoint. Orchestrates multi-character responses.

**Auth:** `user-id` header (read inline — not enforced by `requireAuth` middleware)

**Body**
```json
{
  "userMessage": "string*",
  "conversationHistory": [{ "role": "user | assistant", "content": "string" }],
  "activeCharacters": ["characterId*"],
  "sessionId": "string (optional — creates new session if omitted)",
  "userPersona": { "name": "string", "personality": "string" },
  "currentScene": "scenarioId (optional)"
}
```

**Response**
```json
{
  "sessionId": "string",
  "responses": [{
    "character": "id",
    "characterName": "string",
    "response": "string",
    "timestamp": "ISO string",
    "delay": "number (ms)",
    "isPrimary": true,
    "error": false
  }]
}
```

**Side effects:** Saves user message + character responses to SQLite; updates memories, relationships, learning patterns, topic engagement, and session continuity.

---

## Chat Sessions — `/api/chat`

All routes require `requireAuth`.

### `GET /api/chat/sessions`

List the last 20 sessions for the authenticated user.

**Response**
```json
{ "sessions": [{ "id": "string", "title": "string", "created_at": "ISO" }] }
```

---

### `GET /api/chat/sessions/:sessionId`

Get a session with its messages (up to 100).

**Response**
```json
{
  "session": { "id": "string", "title": "string", ... },
  "messages": [{ "id": "string", "sender_type": "user | character | system | narrator", "content": "string", "created_at": "ISO" }]
}
```

---

### `POST /api/chat/sessions`

Create a new chat session.

**Body**
```json
{
  "title": "string",
  "characterIds": ["id"],
  "scenarioId": "string (optional)"
}
```

**Response:** new session object

---

### `PUT /api/chat/sessions/:sessionId`

Update session metadata.

**Body**
```json
{ "title": "string" }
```

**Response:** updated session object

---

### `DELETE /api/chat/sessions/:sessionId`

Delete a session and all its messages.

**Response**
```json
{ "success": true }
```

---

### `POST /api/chat/sessions/:sessionId/feedback`

Submit a 1–5 star rating on a response.

**Body**
```json
{ "messageId": "string", "rating": 1 }
```

**Response:** saved feedback object

---

## Characters — `/api/characters`

All routes require `requireAuth`.

### `GET /api/characters`

List all characters for the authenticated user (user-created + non-hidden defaults).

**Query params:** `page`, `limit`, `search`

**Response**
```json
{ "characters": [...], "total": 0 }
```

---

### `POST /api/characters`

Create a new character.

**Body**
```json
{
  "name": "string* (unique per user)",
  "personality": "string*",
  "age": "number (>= 18)*",
  "ai_provider": "string",
  "ai_model": "string",
  "tags": [],
  "chat_examples": [],
  "voice_traits": {},
  "speech_patterns": {},
  "temperature": 0.7,
  "max_tokens": 150,
  "top_p": null,
  "frequency_penalty": null,
  "presence_penalty": null,
  "repetition_penalty": null,
  "stop_sequences": null
}
```

**Response:** created character object (201)

**Errors:** `400` if age < 18 or name already exists

---

### `PUT /api/characters/:characterId`

Update a character. Accepts any subset of character fields.

**Response:** updated character object

---

### `DELETE /api/characters/:characterId`

Delete a character.

**Response:** result object

---

### `POST /api/characters/:characterId/hide-default`

Hide a default (built-in) character from the character list.

**Response:** `{ "success": true }`

---

## Community — Characters

`GET` routes are **public**. Mutation routes require `requireAuth`.

### `GET /api/community/characters`

Browse approved community characters.

**Query params**

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | number | 20 | |
| `offset` | number | 0 | |
| `sortBy` | string | `recent` | `recent \| popular \| trending` |
| `tags` | string | — | Comma-separated list |
| `search` | string | — | Searches name + personality |

**Response**
```json
{ "characters": [...], "total": 0, "hasMore": false }
```

---

### `GET /api/community/tags`

Get top 20 popular tags across all published community content.

**Response**
```json
{ "tags": [{ "tag": "string", "count": 0 }] }
```

---

### `POST /api/community/characters/:id/import`

Import a community character from Supabase into local SQLite.

**Response**
```json
{ "character": { ... }, "message": "Character imported successfully" }
```

**Errors:** `503` if Supabase unavailable

---

### `POST /api/community/characters/:id/publish` *(also: `POST /api/characters/:id/publish`)*

Publish a local character to the community hub. Passes through profanity filter; awaits admin approval.

**Body**
```json
{ "isLocked": false, "hiddenFields": [] }
```

**Response:** `{ "communityCharacter": { ... } }`

---

### `POST /api/community/characters/:id/unpublish` *(also: `POST /api/characters/:id/unpublish`)*

Remove a character from the community hub.

**Response:** `{ "success": true }`

---

### `POST /api/community/characters/:id/favorite`

Add a community character to favorites. Requires auth.

**Response:** `{ "success": true }`

---

### `DELETE /api/community/characters/:id/favorite`

Remove a community character from favorites. Requires auth.

**Response:** `{ "success": true }`

---

### `GET /api/community/characters/favorites`

Get all favorited community characters for the authenticated user.

**Response:** `{ "favorites": [...] }`

---

### `POST /api/community/characters/:id/view`

Increment the view count on a community character. No auth required.

**Response:** `{ "success": true }`

---

### `POST /api/community/report`

Submit a report on a community character or scene.

**Body**
```json
{
  "type": "character | scene",
  "contentId": "string",
  "reason": "string"
}
```

**Response:** `{ "report": { ... } }`

---

## Community — Scenes

`GET` routes are **public**. Mutation routes require `requireAuth`.

### `GET /api/community/scenes`

Browse published community scenes.

**Query params:** `limit`, `offset`, `sortBy` (`recent | popular`), `search`

**Response**
```json
{ "scenes": [...], "total": 0, "hasMore": false }
```

---

### `POST /api/community/scenes/:id/publish`

Publish a local scenario to the community hub.

**Body:** `{ "isLocked": false, "hiddenFields": [] }`

**Response:** `{ "communityScene": { ... } }`

---

### `POST /api/community/scenes/:id/unpublish`

Remove a scene from the community hub.

**Response:** `{ "success": true }`

---

### `POST /api/community/scenes/:id/import`

Import a community scene from Supabase into local SQLite.

**Response:** `{ "scenario": { ... } }`

---

### `POST /api/community/scenes/:id/view`

Increment view count on a community scene. No auth required.

**Response:** `{ "success": true }`

---

### `POST /api/community/scenes/:id/favorite`

Add a community scene to favorites.

**Response:** `{ "success": true }`

---

### `DELETE /api/community/scenes/:id/favorite`

Remove a community scene from favorites.

**Response:** `{ "success": true }`

---

### `GET /api/community/scenes/favorites`

Get all favorited community scenes for the authenticated user.

**Response:** `{ "favorites": [...] }`

---

### `POST /api/community/scenes/:id/rate`

Submit a rating on a community scene.

**Body:** `{ "rating": 1 }`

**Response:** `{ "success": true }`

---

## User Settings & Persona — `/api/user`

All routes require `requireAuth`.

### `GET /api/user/settings`

Get settings for the authenticated user. Merges local SQLite preferences with Supabase admin settings if user is admin.

**Response**
```json
{
  "apiKeys": { "openai": "...", "anthropic": "...", "openrouter": "...", "google": "..." },
  "ollamaSettings": { "baseUrl": "string" },
  "lmStudioSettings": { "baseUrl": "string" },
  "groupDynamicsMode": "natural",
  "messageDelay": 1200,
  "defaultModel": "string",
  "defaultProvider": "openai",
  "isAdmin": false,
  "autoApproveCharacters": false,
  "adminSystemPrompt": null
}
```

---

### `PUT /api/user/settings`

Update user settings. Accepts any subset of settings fields. If `autoApproveCharacters` or `adminSystemPrompt` are included and the user is an admin, also saves to Supabase.

**Response:** `{ "settings": { ... }, "message": "Settings updated successfully" }`

---

### `GET /api/user/persona`

Get the user's personas.

**Response:** `{ "personas": [...] }`

---

### `POST /api/user/persona`

Create or update the user's persona.

**Body**
```json
{
  "name": "string* (1–50 chars)",
  "personality": "string*",
  "interests": [],
  "communication_style": "string",
  "avatar": "string",
  "color": "string (Tailwind gradient class)"
}
```

**Response:** persona object + `"message": "User persona saved successfully"`

---

### `DELETE /api/user/persona`

Delete the user's persona.

**Response:** result object

---

## Scenarios — `/api/scenarios`

All routes require `requireAuth`.

### `GET /api/scenarios`

Get all scenarios for the user (user-created + defaults).

**Response:** `{ "scenarios": [...] }`

---

### `POST /api/scenarios`

Create a new scenario.

**Body**
```json
{
  "name": "string*",
  "description": "string",
  "setting": "string",
  "context_rules": "string",
  "tags": [],
  "narrator_enabled": false,
  "narrator_name": "string",
  "narrator_personality": "string",
  "narrator_trigger_mode": "manual | auto_interval | scene_change | action_based",
  "narrator_interval": 5,
  "narrator_temperature": 0.7,
  "narrator_max_tokens": 100
}
```

**Response:** created scenario object

---

### `PUT /api/scenarios/:scenarioId`

Update a scenario. Accepts any subset of scenario fields.

**Response:** updated scenario object

---

### `DELETE /api/scenarios/:scenarioId`

Delete a scenario.

**Response:** result object

**Errors:** `400` if the scenario is currently published to the community

---

### `POST /api/scenarios/:scenarioId/narrator`

Trigger a narrator turn for the given scenario.

**Body**
```json
{
  "conversationHistory": [{ "role": "string", "content": "string" }],
  "userApiKeys": { "openai": "..." }
}
```

**Response:** `{ "response": "string (narrator text or null if not triggered)" }`

---

## Memory — `/api/character`

All routes require `requireAuth`.

### `GET /api/character/:characterId/memories`

Get up to 20 memories for a character×user pair.

**Response:** `{ "memories": [...] }`

---

### `GET /api/character/:characterId/memories/relevant`

Get memories most relevant to the current conversation context.

**Response:** `{ "memories": [...] }`

---

### `DELETE /api/character/:characterId/memories`

Clear all memories for a character.

**Response:** result object

---

## Character Learning — `/api/learning`

All routes require `requireAuth`.

### `GET /api/learning/characters/:characterId`

Get all learning data for a character (communication style, topics, emotions, humor).

**Response:** learning data object

---

### `POST /api/learning/characters/:characterId/interaction`

Record an interaction event for a character.

**Response:** updated learning data

---

### `POST /api/learning/characters/:characterId/communicate`

Update communication style learning.

**Body:** `{ "style": "string", "data": {} }`

**Response:** updated learning data

---

### `POST /api/learning/characters/:characterId/emotions`

Update emotional response learning.

**Body:** `{ "emotion": "string", "data": {} }`

**Response:** updated learning data

---

### `POST /api/learning/characters/:characterId/insights`

Store a new insight about the character's behavior.

**Body:** `{ "insight": "string" }`

**Response:** updated learning data

---

### `POST /api/learning/characters/:characterId/feedback`

Submit feedback that adjusts learning quality rating.

**Body:** `{ "rating": 1, "comment": "string" }`

**Response:** updated learning data

---

### `GET /api/learning/overview`

Get a learning summary across all of the user's characters.

**Response:** summary object

---

### `DELETE /api/learning/characters/:characterId`

Clear all learning data for a character.

**Response:** deletion result

---

## Character Comments — `/api/character-comments`

Operates on Supabase `character_comments` table (community content). All routes require `requireAuth`.

### `GET /api/character-comments/:characterId`

Get all comments on a published community character.

**Response:** `{ "comments": [...] }`

---

### `GET /api/character-comments/:characterId/:commentId`

Get a single comment.

**Response:** comment object

---

### `POST /api/character-comments/:characterId`

Post a comment on a community character.

**Body:** `{ "comment": "string*" }`

**Response:** new comment object (201)

**Errors:** `403` if character not published; `404` if not found

---

### `PUT /api/character-comments/:characterId/:commentId`

Edit your own comment.

**Body:** `{ "comment": "string*" }`

**Response:** updated comment object

---

### `DELETE /api/character-comments/:characterId/:commentId`

Delete your own comment (soft delete — sets `is_deleted = true`).

**Response:** deletion result

---

## Scene Comments — `/api/scene-comments`

Operates on Supabase `scene_comments` table. All routes require `requireAuth`.

### `GET /api/scene-comments/:sceneId`

Get all comments on a published community scene.

**Response:** `{ "comments": [...] }`

---

### `GET /api/scene-comments/:sceneId/:commentId`

Get a single scene comment.

**Response:** comment object

---

### `POST /api/scene-comments/:sceneId`

Post a comment on a community scene.

**Body:** `{ "comment": "string*" }`

**Response:** new comment object (201)

**Errors:** `403` if scene not published; `404` if not found

---

### `PUT /api/scene-comments/:sceneId/:commentId`

Edit your own scene comment.

**Body:** `{ "comment": "string*" }`

**Response:** updated comment object

---

### `DELETE /api/scene-comments/:sceneId/:commentId`

Delete your own scene comment.

**Response:** deletion result

---

## Personas — `/api/personas`

All routes require `requireAuth`.

### `GET /api/personas`

Get all personas for the user. `relationships` field is parsed from JSON.

**Response:** `{ "personas": [...] }`

---

### `GET /api/personas/active`

Get the currently active persona.

**Response:** active persona object

**Errors:** `404` if no personas exist

---

### `POST /api/personas/:personaId/activate`

Set a persona as the active one. Updates the `active_persona_id` in user settings.

**Response:** `{ "persona": { ... }, "message": "Persona activated" }`

---

### `POST /api/personas`

Create a new persona.

**Body**
```json
{
  "name": "string*",
  "personality": "string*",
  "background": "string",
  "interests": [],
  "communication_style": "string",
  "avatar": "string",
  "color": "string",
  "ai_provider": "openai | anthropic | google | openrouter | ollama | lmstudio | custom",
  "ai_model": "string (required if ai_provider set, except custom)"
}
```

**Response:** created persona object (first persona auto-set as active)

---

### `PUT /api/personas/:personaId`

Update a persona. Accepts any subset of persona fields.

**Response:** updated persona object

---

### `DELETE /api/personas/:personaId`

Delete a persona.

**Response:** `{ "success": true }`

**Errors:** `400` if it's the user's only persona; reassigns active persona if needed

---

### `POST /api/personas/:personaId/generate`

Generate an AI response as the given persona.

**Body:** `{ "prompt": "string*" }`

**Response:** `{ "response": "string" }`

**Errors:** `400` if no AI model or API key configured on persona

---

## Relationships — `/api/characters`

All routes require `requireAuth`.

### `GET /api/characters/:characterId/relationships`

Get all relationships for a character. Results enriched with target entity details.

**Query params:** `type` (`user | persona | character`)

**Response:** `{ "relationships": [...] }`

---

### `POST /api/characters/:characterId/relationships`

Create a relationship between a character and a user, persona, or other character.

**Body**
```json
{
  "target_type": "user | persona | character*",
  "target_id": "string*",
  "trust_level": 50,
  "familiarity_level": 50,
  "bond_type": "string"
}
```

**Response:** created relationship object (creates reverse relationship automatically for char-to-char)

---

### `DELETE /api/characters/:characterId/relationships/:relationshipId`

Delete a relationship. Also deletes the reverse relationship for char-to-char pairs.

**Response:** deletion result

---

### `GET /api/characters/:characterId/relationships/available`

Get characters and personas the user could link to (not yet related).

**Response:** `{ "characters": [...], "personas": [...] }`

---

## Images — `/api/images`

All routes require `requireAuth`. Uses `multipart/form-data`.

### `POST /api/images/upload`

Upload an image file.

**Form fields:** `image` (file, ≤ 5 MB, images only), `type` (`character | persona | scenario`)

**Response:** `{ "url": "/uploads/...", "id": "string" }`

---

### `PUT /api/images/characters/:id/image`

Assign an uploaded image to a character.

**Body:** `{ "imageId": "string" }`

**Response:** updated character object

---

### `PUT /api/images/user/persona/image`

Assign an uploaded image to the user's persona.

**Body:** `{ "imageId": "string" }`

**Response:** updated persona object

---

### `PUT /api/images/scenarios/:id/image`

Assign an uploaded image to a scenario.

**Body:** `{ "imageId": "string" }`

**Response:** updated scenario object

**Errors:** `400` for default scenario IDs (`coffee-shop`, `study-group`, `party`)

---

### `DELETE /api/images/:type/:id`

Delete an uploaded image. Removes from DB and disk.

**Params:** `type` (`character | persona | scenario`), `id` (image record ID)

**Response:** deletion result

---

## Custom Models — `/api/custom-models`

All routes require `requireAuth`.

### `GET /api/custom-models`

Get all custom model presets for the user.

**Response:** `{ "models": [...] }`

---

### `GET /api/custom-models/:id`

Get a single custom model preset.

**Response:** model preset object

**Errors:** `404` if not found

---

### `POST /api/custom-models`

Create a custom model preset.

**Body**
```json
{
  "name": "string*",
  "provider": "string*",
  "model_id": "string*",
  "temperature": 0.7,
  "top_p": null,
  "frequency_penalty": null,
  "presence_penalty": null,
  "repetition_penalty": null,
  "stop_sequences": null,
  "max_tokens": 150,
  "custom_system_prompt": "string (optional)"
}
```

**Response:** created model preset (201)

---

### `PUT /api/custom-models/:id`

Update a custom model preset. Accepts any subset of model fields.

**Response:** updated model preset

**Errors:** `404` if not found

---

### `DELETE /api/custom-models/:id`

Delete a custom model preset.

**Response:** deletion result

**Errors:** `404` if not found

---

## Moderation — `/api/moderation`

All routes require `requireAuth` + `requireAdmin`.

### `GET /api/moderation/queue`

Get all community characters with `moderation_status` of `pending` or `rejected`.

**Response:** `{ "queue": [...], "total": 0 }`

---

### `GET /api/moderation/stats`

Get moderation statistics.

**Response**
```json
{
  "pending": 0,
  "approved": 0,
  "rejected": 0,
  "unresolvedReports": 0,
  "totalCharacters": 0,
  "totalScenes": 0,
  "totalUsers": 0,
  "topCharacters": [{ "name": "string", "import_count": 0 }],
  "topScenes": [{ "name": "string", "view_count": 0 }]
}
```

---

### `GET /api/moderation/reports`

Get all community reports.

**Query params:** `status` (`pending | reviewed | actioned | dismissed`), `type` (`character | scene | all`)

**Response:** `{ "reports": [...], "total": 0 }`

---

### `POST /api/moderation/reports/:reportId/resolve`

Resolve a report.

**Body**
```json
{
  "action": "dismiss | unpublish*",
  "notes": "string (optional)"
}
```

**Response:** `{ "message": "Report resolved successfully", "report": { ... }, "action": "string", "type": "character | scene" }`

---

### `POST /api/moderation/approve/:characterId`

Approve a community character — sets `moderation_status = 'approved'`.

**Response:** `{ "message": "Character approved successfully", "character": { ... } }`

---

### `POST /api/moderation/reject/:characterId`

Reject a community character — sets `moderation_status = 'rejected'`.

**Body:** `{ "reason": "string (optional)" }`

**Response:** `{ "message": "Character rejected", "character": { ... }, "reason": "string" }`

---

### `POST /api/moderation/bulk-approve`

Approve multiple community characters at once.

**Body:** `{ "characterIds": ["string*"] }`

**Response:** `{ "message": "N characters approved successfully", "count": 0 }`

---

## Error Responses

All endpoints return errors in this shape:

```json
{ "error": "Human-readable message" }
```

Common status codes:

| Code | Meaning |
|---|---|
| `400` | Bad request — validation failed or missing required field |
| `401` | Missing `user-id` header |
| `403` | Forbidden — not the owner of the resource |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Community features unavailable (Supabase offline) |
