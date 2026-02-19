# CHAIT World — Copilot Instructions

## Product Vision

CHAIT World is a **standalone AI chat application** — users can use it fully without logging in (SQLite stores everything locally). Google OAuth login (`frontend/src/contexts/AuthContext.js`) is **optional** and only needed to access community features (publishing, browsing, commenting on shared content). Never gate core chat functionality behind auth.

## Architecture Overview

- **`backend/`** — Node.js/Express API (`server-supabase.js` is the entry point)
- **`frontend/`** — React 18 SPA with Tailwind CSS (proxies to `localhost:3001`)
- **`data/`** — Local SQLite DB (`data/local.db`) and uploaded images (`data/uploads/`)

### Dual Database Model (Critical)
All user data (characters, chat sessions, messages, memories) lives in **SQLite via `LocalDatabaseService`**. Supabase handles **only** community publishing, sharing, comments, and admin operations. The `DatabaseService` (`backend/services/database.js`) composes both layers and is the canonical gateway — never import `LocalDatabaseService` or `SupabaseAdminTokenService` directly in routes.

```
Local SQLite  ← characters, sessions, messages, memories, personas, relationships (no login required)
Supabase      ← community hub (publish/share/comments), admin_users table
```

> The token/credit system has been fully removed. Do not reference or recreate any token, billing, or credit logic anywhere in the codebase.

Community content requires **admin approval** (single admin, owner-controlled via the `admin_users` Supabase table + `requireAdmin` middleware). Published content goes through profanity filtering before it's visible.

## Dev Workflows

```bash
# Backend (from backend/)
npm run dev        # nodemon server-supabase.js, port 3001

# Frontend (from frontend/)
npm start          # CRA dev server, port 3000 (proxies /api → 3001)

# Run both: open two terminals
```

Required `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, and provider API keys.

## Request Authentication

The backend **does not use JWT middleware**. The frontend passes the Supabase `user.id` as a plain header:

```js
headers: { 'user-id': user.id, 'Content-Type': 'application/json' }
```

`requireAuth` (inline in `server-supabase.js`) reads `req.headers['user-id']`. Admin routes additionally use `requireAdmin` from `middleware/adminAuth.js`, which checks the Supabase `admin_users` table.

## Route Registration Pattern

All routes are factory functions that receive `db` (a `DatabaseService` instance):

```js
// server-supabase.js
const chatSessionRoutes = require('./routes/chat-sessions')(db);
app.use('/api/chat-sessions', requireAuth, chatSessionRoutes);
```

When adding a new route file, follow this factory pattern and register it in `server-supabase.js`.

## AI Provider Pipeline (group-chat flow)

The main chat endpoint (`POST /api/group-chat`) orchestrates:
1. **`ResponsePlanner`** — decides which characters reply
2. **`PromptBuilder`** — assembles a 7-layer system prompt per character (base → character → relationships → memory → scene → continuity → instructions)
3. **`AIProviderService.generateResponse(character, messages, apiKeys)`** — routes to OpenAI / Anthropic / OpenRouter / Gemini / Ollama / LM Studio / `custom` based on `character.ai_provider`; falls back to `character.fallback_provider` on error
4. **`MemoryService`** + **`CharacterLearningService`** — persist memories after each turn

Characters with `ai_provider: 'custom'` route via OpenRouter and prepend an admin-controlled system prompt (see `docs/custom_models_guide.md`).

## AI Provider Keys & Custom Models

Users supply their own API keys (stored in `user_settings_local.api_keys` JSON blob) or configure a local LLM (Ollama / LM Studio). There is no credit or token billing system. `SupabaseAdminTokenService` is kept only for `isAdmin()`, admin user CRUD, and `getAdminSettings()`/`updateAdminSettings()` — all balance/transaction/token-model methods have been removed. Do not re-add them.

Custom model presets are managed via the **Model Manager** tab in the frontend settings. Each preset defines: `provider`, `model_id`, `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `stop_sequences`, `max_tokens`, and an optional `custom_system_prompt`. Custom models route via their configured provider using the user's own API key — no server-side key injection.

## Frontend State Pattern

`MainApp.js` is the root orchestrator. State is split into domain-specific custom hooks (`useChat`, `useCharacters`, `useSettings`, `usePersonas`) all sharing a single `apiRequest` function created via `createApiClient(user.id)`. Always pass `apiRequest` down from `MainApp` — don't create new client instances in child components.

`useTokens` and `UserCreditsPanel` have been removed. Do not re-add token balance state.

## Key Constants

All magic numbers live in `backend/constants/defaults.js` — `AI_DEFAULTS`, `RATE_LIMITS`, `CHAT_DEFAULTS`, `STRING_LIMITS`. Import from there instead of hardcoding values.

## Content Rules

- Characters must be `age >= 18` (enforced in backend via `AI_DEFAULTS.MIN_CHARACTER_AGE`)
- Profanity filter (`bad-words` package + `utils/profanityFilter.js`) is applied to published community content
- Memory types must be one of: `episodic | semantic | emotional | relational` (`fact` is remapped to `semantic`)

## Agent Workflow

### Planning
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Write specs/plan to `tasks/todo.md` with checkable items before implementing
- If something goes sideways mid-task, **stop and re-plan** — don't keep pushing
- Check in after writing the plan before starting implementation

### Subagent Strategy
- Offload research, exploration, and parallel analysis to subagents to keep the main context clean
- One focused task per subagent
- Use subagents for complex problems that benefit from more compute

### Task Tracking
1. Write plan to `tasks/todo.md` with checkable items
2. Mark items complete as you go
3. Add a summary/review at the end of `tasks/todo.md`
4. After any correction from the user: update `tasks/lessons.md` with the pattern to avoid repeating it

### Verification Before Done
- Never mark a task complete without proving it works
- Run tests, check logs, or demonstrate correctness
- Ask: *"Would a staff engineer approve this?"*
- Diff behavior between main and your changes when relevant

### Code Quality
- **Simplicity first**: make every change as simple as possible; minimal code impact
- **No temporary fixes**: find root causes; senior developer standards
- **Elegance check** (non-trivial changes only): pause and ask "is there a more elegant way?" before finalizing
- **Autonomous bug fixing**: when given a bug report, fix it — don't ask for hand-holding; trace logs/errors to resolution

### Self-Improvement
- After any user correction, update `tasks/lessons.md` with the rule that prevents the same mistake
- Review `tasks/lessons.md` at the start of each session for relevant patterns

## Active Roadmap & Design Decisions

### Stream 1 — Remove Token/Credit System ✅ COMPLETE
All token/credit code has been removed from frontend and partially from backend. The following backend cleanup tasks are **still pending** — complete these next:

- [ ] Strip `SupabaseAdminTokenService.js`: remove all `token_models` CRUD methods and `admin_api_keys` methods. Keep only: `isAdmin`, `getAdminUsers`, `grantAdmin`, `revokeAdmin`, `getAdminSettings`, `updateAdminSettings`
- [ ] Clean `backend/routes/scenarios.js`: remove `supabaseTokenService` require, remove `'token'` provider block, remove `useServerKeys`/`modelCost`/`adminApiKeys`/`tokenModel` vars, remove token deduction block, remove `'token'` from `validProviders`
- [ ] Clean `backend/routes/personas.js`: remove `supabaseTokenService` require, entire `'token'` provider if block, associated vars, token deduction block
- [ ] Clean `backend/routes/group-chat.js`: remove direct `createClient`/`supabase` init at top (use `db` instead), remove `useServerKeys`/`supabaseTokenService` dead code in error handler, fix `character_relationships` queries to use `db` instead of direct `supabase` client
- [ ] Delete `backend/routes/admin-keys.js` and remove its registration from `server-supabase.js`
- [ ] Clean `AIProviderService.js`: remove static `getTokenModels()` method and its JSDoc comment about server keys
- [ ] Run Supabase SQL to drop dead tables: `DROP TABLE IF EXISTS token_models CASCADE; DROP TABLE IF EXISTS failed_transactions CASCADE; DROP TABLE IF EXISTS admin_api_keys CASCADE; DROP TABLE IF EXISTS user_tokens CASCADE; DROP TABLE IF EXISTS token_transactions CASCADE; DROP TABLE IF EXISTS provider_pricing_cache CASCADE;`

**Do NOT** remove the `'custom'` provider path — it stays, using the user's own OpenRouter key.

### Stream 2 — Admin Panel: Approval Only ✅ COMPLETE
- `ModerationPanel.js` keeps only `pending` and `reports` tabs
- Deleted: `TokenModelsPanel.js`, `TokenAnalyticsDashboard.js`, `FailedTransactionsPanel.js`
- Removed backend routes: `/api/pricing`, token-admin endpoints
- Deleted: `backend/routes/pricing.js`, `backend/services/LivePricingService.js`

### Stream 3 — Granular Model Parameters ✅ COMPLETE
- Added columns to `characters` and `custom_models` via `runMigrations()`: `top_p`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `stop_sequences` (JSON)
- Parameters passed through `AIProviderService` per provider
- Collapsible "Advanced" section added in `CharacterEditor.js`
- Provider support: `top_p` — all; `frequency_penalty`/`presence_penalty` — OpenAI, OpenRouter, LMStudio; `repetition_penalty` — Ollama, OpenRouter; `stop` — all
- Model params are also sent to Supabase `community_characters` when publishing

### Stream 4 — Model Manager Tab + UI Design System ✅ COMPLETE
- **Model Manager** tab added in `SettingsModal.js`: create/edit custom model presets with all advanced params; manage default model per provider
- Per-provider defaults stored in `user_settings_local.preferences` JSON
- UI Design System: `frontend/src/styles/ui.js` with named Tailwind class constants; `tailwind.config.js` extended with semantic color tokens

---

## Database Schema Reference

### SQLite Tables (`data/local.db`) — defined in `backend/database/schema.sql`

All personal/app data. No login required.

| Table | Purpose |
|---|---|
| `characters` | User-created AI characters (name, personality, age, provider, model, voice traits, etc.) |
| `scenarios` | Chat scenes/settings with narrator config, context rules, scene state |
| `chat_sessions` | Chat session metadata — links characters + scenario |
| `messages` | All chat messages (`sender_type`: user / character / system / narrator) |
| `character_memories` | Per-character memories (`memory_type`: episodic / semantic / emotional / relational) |
| `character_relationships` | Trust/familiarity/bond tracking between a character and a user, persona, or other character |
| `character_learning` | Learned communication patterns per character (`learning_type`: communication_style / topic_preference / emotional_response / humor_style) |
| `character_session_state` | Per-session mood, energy, engagement, active topics for each character |
| `character_topic_engagement` | How much each character engages with specific topics over time |
| `user_personas` | User-created personas that characters adapt to |
| `user_images` | Uploaded avatar and background images metadata |
| `user_settings_local` | API keys (JSON blob), Ollama/LM Studio settings, preferences |
| `custom_models` | User-managed custom model presets (provider, model_id, temperature, top_p, advanced params) |
| `character_notes` | Local notes/ratings on characters (private, not community) — was `character_comments` pre-rename |
| `scene_notes` | Local notes/ratings on scenarios (private, not community) — was `scene_comments` pre-rename |
| `hidden_default_characters` | Tracks which default characters a user has hidden |
| `response_feedback` | 1–5 star ratings on AI responses |
| `schema_version` | Migration tracking |

> **Table rename migration**: `LocalDatabaseService.js` automatically renames `character_comments` → `character_notes` and `scene_comments` → `scene_notes` at startup if the old names exist. This avoids name collision with the Supabase community tables of the same name.

> JSON columns (`tags`, `chat_examples`, `relationships`, `voice_traits`, `speech_patterns`, etc.) are stored as serialized strings — parse/stringify on read/write.

### Supabase Tables — community and admin only

All community/social features. Login required.

| Table | Key Columns | Purpose |
|---|---|---|
| `community_characters` | `original_character_id`, `creator_user_id`, `moderation_status`, `hidden_fields` (jsonb), `is_locked` | Published characters awaiting/post admin approval |
| `community_scenes` | `original_scenario_id`, `creator_user_id`, `moderation_status`, `tags` (jsonb), `favorite_count`, `hidden_fields` (jsonb), `is_locked` | Published scenes awaiting/post admin approval |
| `character_comments` | `character_id`, `user_id`, `comment`, `is_deleted` | Community comments on published characters |
| `scene_comments` | `scene_id`, `user_id`, `comment`, `is_deleted` | Community comments on published scenes |
| `character_imports` | `original_character_id`, `imported_character_id`, `imported_by_user_id` | Tracks when a user imports a community character |
| `scene_imports` | `original_scenario_id`, `imported_scenario_id`, `imported_by_user_id` | Tracks when a user imports a community scene |
| `character_favorites` | `user_id`, `character_id` | User favorites on community characters |
| `scene_favorites` | `user_id`, `scene_id` | User favorites on community scenes |
| `community_reports` | `community_character_id`, `community_scene_id`, `reporter_user_id`, `report_type`, `status`, `reviewed_by`, `reviewed_at`, `action_taken` | Reports against published community content |
| `admin_users` | `user_id`, `auto_approve_characters`, `admin_system_prompt` | Single-owner admin access (checked by `requireAdmin` middleware) |

> **Dead Supabase tables** (token system legacy — safe to drop): `token_models`, `failed_transactions`, `admin_api_keys`, `user_tokens`, `token_transactions`, `provider_pricing_cache`. Drop script: `DROP TABLE IF EXISTS token_models, failed_transactions, admin_api_keys, user_tokens, token_transactions, provider_pricing_cache CASCADE;`
