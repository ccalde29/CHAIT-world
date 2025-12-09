# Custom Models Guide

This guide explains how to define and use admin-created custom models in CHAIT World. Custom models are presets stored in Supabase that let you:
- Point to any model available via OpenRouter (unified gateway).
- Inject an additional system prompt layer to steer behavior globally.
- Set default temperature and max tokens used at runtime.

## How It Works (Code Overview)

- Backend service: `backend/services/AIProviderService.js`
  - `callCustomModel(customModelId, messages, openRouterApiKey, character)`
  - Loads the `custom_models` row, optionally appends `custom_system_prompt` to the existing system message, and then calls OpenRouter with `openrouter_model_id`.
  - Applies the model’s `temperature` and `max_tokens` as runtime defaults.
- Routes: `backend/routes/custom-models.js`
  - CRUD endpoints for admins to create, update, list, and delete custom models.
  - Public `GET /api/custom-models` returns active models for all users.
- Provider listing: `backend/routes/providers.js`
  - `POST /api/providers/models` can return custom models list via `AIProviderService.getCustomModels()` when `provider=custom`.

## Data Model (Supabase table `custom_models`)

A custom model row includes:
- `id`: UUID (auto)
- `name`: Internal unique name
- `display_name`: Friendly name shown to users
- `description`: Optional summary of purpose
- `openrouter_model_id`: Target model id on OpenRouter (e.g., `openai/gpt-4o-mini`, `anthropic/claude-3-5-haiku-20241022`)
- `custom_system_prompt`: Extra system instructions appended after the default system prompt
- `temperature`: Default creativity (0.0–2.0)
- `max_tokens`: Default output length (50–1000)
- `tags`: Array of strings (e.g., `['narrator', 'creative', 'fast']`)
- `is_active`: Boolean to expose to users
- `created_by_admin_id`, `created_at`, `updated_at`: Metadata

## Prerequisites

- Admin access (for create/update/delete)
- OpenRouter API key configured on the user making requests (used at inference time)
- Supabase environment vars set in backend:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Creating a Custom Model (Admin)

Use the backend route `POST /api/custom-models` with required fields. Example request body:

```json
{
  "name": "creative_narrator_v1",
  "display_name": "Creative Narrator v1",
  "description": "Poetic atmospheric narration; concise and vivid",
  "openrouter_model_id": "openai/gpt-4o-mini",
  "custom_system_prompt": "You are a narrator that describes scenes poetically but succinctly. Avoid dialogue and focus on sensory details and mood.",
  "temperature": 0.9,
  "max_tokens": 120,
  "tags": ["narrator", "poetic", "concise"]
}
```

Response includes the created model row. Validation rules:
- `name`, `display_name`, `openrouter_model_id` are required
- `temperature`: 0.0–2.0
- `max_tokens`: 50–1000
- Duplicate `name` is rejected

## Updating/Deleting (Admin)

- Update: `PUT /api/custom-models/:id` with only fields you want to change. Temperature and max token validation applies.
- Delete: `DELETE /api/custom-models/:id`

## Listing Models

- Public active list: `GET /api/custom-models` → `{ models: [...] }`
- Admin full list: `GET /api/custom-models/admin` → includes inactive models
- Provider models for UI dropdowns: `POST /api/providers/models` with `{ "provider": "custom" }` → returns active custom models.

## Using a Custom Model at Runtime

There are two primary integrations:

1) Per-character:
- In the Character Editor, set `ai_provider = "custom"` and choose a custom model ID returned from the providers/models endpoint.
- At group chat time, the backend will call `AIProviderService.callCustomModel(...)` which:
  - Looks up the custom model by `ai_model` (custom model id)
  - Injects `custom_system_prompt` into the system message layer
  - Routes the request to OpenRouter using your OpenRouter API key
  - Applies the custom model’s `temperature` and `max_tokens`

2) Scene Narrator:
- In the Scene Editor, set `narrator_ai_provider = "custom"` and select the desired custom model id.
- Narrator outputs will then follow the same system prompt injection and model routing.

3) Personas (optional):
- If your UI enables persona auto-responses, you can also pick `provider = "custom"` and a custom model id there.

## Best Practices for `custom_system_prompt`

- Keep it short, specific, and style-focused. Avoid hard constraints that conflict with character/scene logic.
- Use declarative guidance: e.g., "Summarize ambient changes every 5 messages in 2–3 sentences."
- Do not restate safety policies; providers already enforce them.

## Troubleshooting

- "Custom model not found or inactive": Ensure the `id` is correct and `is_active = true`.
- "OpenRouter API key required": Users must have an OpenRouter key configured in settings to run custom models.
- Empty model lists in UI: Call `POST /api/providers/models` with `{ provider: "custom" }` to fetch active custom models; ensure backend Supabase env vars are set.
- Provider errors: Inspect server logs for the provider-specific error (OpenRouter, Anthropic via OpenRouter, etc.).

## Quick Test

You can validate a custom model by calling the group chat route with a character configured to `ai_provider = "custom"` and `ai_model = <custom_model_id>`. Ensure your user has an OpenRouter API key.

---

References:
- `backend/services/AIProviderService.js`
- `backend/routes/custom-models.js`
- `backend/routes/providers.js`