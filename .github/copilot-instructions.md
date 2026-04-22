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

> **Note**: The SQLite tables `character_notes` and `scene_notes` serve a different purpose than the Supabase tables `character_comments` and `scene_comments`. The SQLite tables are private local notes/ratings; the Supabase tables are community comments. Do not confuse them.
