# CHAIT World — Refactor Task Board

## Stream 1 — Remove Token/Credit System ✅

- [x] Delete `frontend/src/hooks/useTokens.js`
- [x] Delete `frontend/src/components/UserCreditsPanel.js`
- [x] Remove `useTokens` import and `const tokens = useTokens(apiRequest)` from `MainApp.js`
- [x] Remove `tokens.refreshBalance()` calls after sendMessage and editMessage in `MainApp.js`
- [x] Remove `tokenBalance` and `tokensLoading` props passed to `NavigationSidebar`
- [x] Remove token balance display from `NavigationSidebar.js` (removed `Coins` import, removed balance block)
- [x] Remove Credits tab + `UserCreditsPanel` from `CharacterSceneHub.js` (removed `Coins` import, tab button, and tab panel)
- [x] Remove `ai_provider === 'token'` block from `backend/routes/group-chat.js` (lines ~381–430)
- [x] Remove `supabaseTokenService` import from `group-chat.js`
- [x] Unregister `/api/tokens`, `/api/pricing`, `/api/token-models` routes from `server-supabase.js`
- [x] Strip all balance/deduction/transaction methods from `SupabaseAdminTokenService.js` (kept `isAdmin`, `getAdminApiKeys`, `getTokenModels`)
- [x] Delete `backend/routes/tokens.js`
- [x] Delete `backend/routes/pricing.js`
- [x] Delete `backend/routes/token-models.js`
- [x] Delete `backend/services/LivePricingService.js`

### Review
Stream 1 complete. All token/credit system code removed — frontend and backend. No errors. `SupabaseAdminTokenService` now only exposes admin auth, API keys, and token model reads.

---

## Stream 2 — Admin Panel: Approval Only ✅

- [x] Remove tabs from `ModerationPanel.js`: delete `pricing`, `token-models`, `user-balances`, `analytics` tab logic and all related state/fetch functions
- [x] Remove imports of `TokenModelsPanel`, `TokenAnalyticsDashboard`, `FailedTransactionsPanel` from `ModerationPanel.js`
- [x] Delete `frontend/src/components/TokenModelsPanel.js`
- [x] Delete `frontend/src/components/TokenAnalyticsDashboard.js`
- [x] Delete `frontend/src/components/FailedTransactionsPanel.js`
- [x] Unregister `/api/pricing` and `/api/token-models` from `server-supabase.js` (done in Stream 1)
- [x] Delete `backend/routes/pricing.js` (done in Stream 1)
- [x] Delete `backend/routes/token-models.js` (done in Stream 1)
- [x] Delete `backend/services/LivePricingService.js` (done in Stream 1)
- [x] Verify admin panel renders correctly with only `pending`, `reports`, and `stats` tabs

### Review
Stream 2 complete. `ModerationPanel.js` stripped to 3 tabs (Pending, Reports, Stats). All 3 obsolete panel components deleted. No errors. Backend moderation routes had no token-related endpoints to clean up.

---

## Stream 3 — Granular Model Parameters ✅

- [x] Add migration in `LocalDatabaseService.runMigrations()` for `characters` table: `top_p`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `stop_sequences TEXT`
- [x] Same migration for `custom_models` table
- [x] Update `AIProviderService.callOpenAI()` to pass `top_p`, `frequency_penalty`, `presence_penalty`, `stop` from character if set
- [x] Update `AIProviderService.callAnthropic()` to pass `top_p`, `stop_sequences`
- [x] Update `AIProviderService.callGemini()` `generationConfig` to pass `topP`, `stopSequences`
- [x] Update `AIProviderService.callOpenRouter()` to pass `top_p`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `stop`
- [x] Update `AIProviderService.callOllama()` to pass `top_p`, `repeat_penalty`, `stop` via `options` object
- [x] Update `AIProviderService.callLMStudio()` to pass `top_p`, `frequency_penalty`, `presence_penalty`, `stop`
- [x] Add `MODEL_PARAMS` section to `backend/constants/defaults.js`
- [x] Add new fields to `createCharacter` INSERT, `updateCharacter` allowedFields, and `parseCharacterJson`
- [x] Add `top_p`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `stop_sequences` to `formData` defaults and character init in `CharacterEditor.js`
- [x] Add collapsible "Advanced Model Parameters" section in `CharacterEditor.js` with per-field Reset buttons

### Review
Stream 3 complete. All new params flow end-to-end: DB migration → DB layer → routes (pass-through via req.body) → AIProviderService per provider. UI is a collapsible section below Memory toggle, closed by default, with slider + Reset for numeric params and a comma-separated text input for stop sequences.

---

## Stream 4 — Model Manager Tab + UI Design System

### 4a — Model Manager Tab
- [ ] Create `frontend/src/components/ModelManager.js` — list/create/edit/delete custom model presets with all params (provider, model_id, temperature, top_p, frequency_penalty, presence_penalty, repetition_penalty, stop_sequences, max_tokens, custom_system_prompt)
- [ ] Add Model Manager as a tab in `SettingsModal.js`
- [ ] Add "Provider Defaults" section in Model Manager: per-provider default model stored in `user_settings_local.preferences` JSON
- [ ] Fix provider default inconsistency: on `SettingsModal` load, populate default model dropdowns from the stored per-provider preferences
- [ ] Wire up backend CRUD for custom models (reuse or adapt existing `custom_models` SQLite table routes if they exist)

### 4b — UI Design System
- [ ] Audit top reused Tailwind class patterns across 5 largest components
- [ ] Create `frontend/src/styles/ui.js` with named class constants (btn, card, modal, input, badge, tab)
- [ ] Extend `tailwind.config.js` with semantic color tokens (`surface`, `border`, `accent`, `muted`)
- [ ] Migrate `SettingsModal.js` to use shared classes (pilot component)
- [ ] Migrate remaining components progressively

### Review
<!-- Add summary when complete -->
