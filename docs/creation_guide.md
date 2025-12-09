# CHAIT World Creation Guide

This guide walks you through creating Characters, Scenes, and Personas using the actual fields present in the app. It also explains where AI models can be injected at each layer so you can tailor behavior per character, per scene (narrator), and per persona.

## Characters

- **Required fields:**
  - **`name`**: Up to 50 chars.
  - **`age`**: Must be 18+.
  - **`personality`**: 20–500 chars. Core description shaping voice, background, style, interests, and interaction approach.
- **Descriptive fields:**
  - **`appearance`**: Up to 1000 chars; physical look, style, notable features.
  - **`background`**: Optional extra backstory.
  - **`tags`**: Free-form labels (e.g., "barista", "mystic"). Add several; used for discovery/organization.
- **Avatar:**
  - **`avatar_image_url`**, **`avatar_image_filename`**, **`uses_custom_image`**. You can upload an image (recommended) or fallback to **`avatar`** emoji.
- **Memory & examples:**
  - **`memory_enabled`**: Enable to let the character remember facts, relationship updates, and evolving context.
  - **`chat_examples`**: Optional sample exchanges to reinforce tone.
- **Relationships:**
  - Create links to other characters or to the user's personas. Each relationship has:
    - **`relationship_type`**: e.g., `friend`, `rival`, `mentor`, `romantic_partner`, etc.
    - **`trust_level`** (0–1), **`familiarity_level`** (0–1), **`emotional_bond`** (-1–1), optional **`custom_context`**.
  - Relationships are factored into prompts and response planning.
- **Response controls:**
  - **`temperature`** (0–1.5): Creativity vs. focus; also influences mood volatility.
  - **`max_tokens`** (50–500): Response length.
  - **`context_window`**: Target context capacity (used by planners/provider adapters).
- **AI Model injection (per character):**
  - **`ai_provider`**: `openai`, `anthropic`, `openrouter`, `google`, `ollama` (local), `lmstudio` (local), or `custom`.
  - **`ai_model`**: Model ID from provider listing. You can refresh available models from Settings/API.
  - Backend uses these to build layered system prompts and to budget tokens/temperature dynamically per turn.

### Tips

- Put the bulk of voice and behavior in `personality`. The app’s `PromptBuilder` layers in scene context, persona context, memories, and relationships automatically.
- Enable `memory_enabled` for continuity and relationship tracking across chats; disable for one-offs.
- Use relationships to define social fabric; the `ResponsePlanner` uses them to choose responders and modulate tone.

## Scenes

Scenes set location, mood, and optional narration.

- **Core fields:**
  - **`name`**: Up to 50 chars.
  - **`description`**: Up to 200 chars; short location summary.
  - **`initial_message`**: Up to 500 chars; displayed at chat start to set context.
  - **`atmosphere`**: Up to 100 chars; mood tag (e.g., "relaxed and friendly").
- **Background:**
  - **`background_image_url`**, **`background_image_filename`**, **`uses_custom_background`** for visual ambiance.
- **Publishing:**
  - Scenes can be published/unpublished to community (when supported by UI/API).
- **AI Narrator (optional, per scene):**
  - **`narrator_enabled`**: Toggle narration.
  - **`narrator_ai_provider`**, **`narrator_ai_model`**: Inject a distinct model for narration separate from characters.
  - **`narrator_temperature`** (0–2.0), **`narrator_max_tokens`** (50–200): Control style/length.
  - **`narrator_trigger_mode`**: `manual`, `auto_interval` (every N messages), `action_based`, `scene_change`.
  - **`narrator_interval`**: Used with `auto_interval`.
  - **`narrator_personality`**: Optional style descriptor (e.g., "poetic and descriptive").

### Tips

- Keep `initial_message` descriptive and non-directive; characters will respond naturally to user prompts, with scene context layered in.
- Narrator is great for ambient transitions and setting mood; select a fast model for frequent narration.

## Personas

Personas are different versions of the user that influence how characters adapt to you.

- **Core fields:**
  - **`name`**: Up to 50 chars.
  - **`personality`**: 20–500 chars; how you present yourself.
  - **`communication_style`**: Up to 100 chars; optional style tag.
  - **`interests`**: Array of strings; add common interests for quick context.
- **Avatar & theme:**
  - **`avatar_image_url`**, **`avatar_image_filename`**, **`uses_custom_image`**, or **`avatar`** emoji.
  - **`color`**: Theme gradient for UI representation.
- **Auto-response controls (optional):**
  - **`ai_provider`**, **`ai_model`**: If enabling persona auto-responses or summarization, pick provider/model.
  - **`temperature`**, **`max_tokens`**: Control persona-generated outputs where applicable.

### Tips

- Keep personas distinct (different interests/styles) so characters can adapt their tone and references via the layered prompt.
- You can link character relationships to a persona to simulate special familiarity or shared history.

## How AI Injection Works Across Layers

- **Characters:** Each character can specify `ai_provider` and `ai_model`. The backend’s `group-chat` endpoint builds a provider-adapted system prompt per responding character, applies dynamic temperature/token budgets, and generates a response via `AIProviderService`. Memories, relationships, and continuity are included.
- **Scenes (Narrator):** A separate model can be selected for narration. It runs under the configured trigger mode and produces short context or atmospheric descriptions.
- **Personas:** Personas can define their own provider/model for any auto-generated persona outputs. Their fields are fed into prompts as "user context" so characters adapt to the active persona.

## Backend Flow (Group Chat)

1. Creates/uses a `chat_sessions` record and logs the user message.
2. Loads active `characters`, user settings/API keys, and optional `scene`.
3. Uses `ConversationStateTracker`, `ProviderAdapter.analyzeContext`, and `ResponsePlanner.planGroupResponse` to decide which characters respond.
4. For each responding character, loads:
   - Relevant `memories` via `MemoryRelevanceService`.
   - `character_relationships` (including to the user/persona).
   - `learningData` and `sessionContinuity`.
5. Builds layered prompts via `PromptBuilder` and adapts them per provider, applying dynamic `temperature` and `max_tokens`.
6. Normalizes and stores responses with metadata, then updates memory and relationship signals.

## Quick Setup Checklist

- Characters
  - Fill `name`, `age` (18+), `personality`.
  - Upload avatar image and add `tags`.
  - Choose `ai_provider` and `ai_model`; tune `temperature` and `max_tokens`.
  - Enable `memory_enabled` for continuity; add relationships.
- Scenes
  - Set `name`, `description`, `initial_message`, optional `atmosphere`.
  - Add background image; optionally enable narrator with its own provider/model.
- Personas
  - Define `name`, `personality`, `communication_style`, and `interests`.
  - Set avatar/theme; optionally set provider/model for persona-driven outputs.

## Model and Provider Notes

- API providers: `openai`, `anthropic`, `openrouter`, `google`. Configure API keys in Settings for model lists.
- Local providers: `ollama`, `lmstudio`. Ensure services are running and accessible via configured base URLs.
- "Custom" allows admin-defined presets; consult `Custom Models` panel if present.

## Best Practices

- Keep fields concise but specific; prompts work best with clear persona/character definitions.
- Use relationships to encode social history and trust—characters will reference it naturally.
- Prefer smaller/cheaper models for quick chats and narration; upgrade characters that need deep reasoning.

---

For advanced configuration, see backend `routes/group-chat.js` and frontend editors:
`src/components/CharacterEditor.js`, `SceneEditor.js`, `PersonaManager.js`.
