// backend/routes/scenarios.js
// Routes for scenario management

const express = require('express');
const router = express.Router();
const supabaseTokenService = require('../services/SupabaseAdminTokenService');

module.exports = (db) => {
    
    /**
     * Get all scenarios
     * GET /api/scenarios
     */
    router.get('/', async (req, res) => {
        try {
            const result = await db.getScenarios(req.userId);
            res.json(result);
        } catch (error) {
            console.error('Error fetching scenarios:', error);
            res.status(500).json({ error: 'Failed to fetch scenarios' });
        }
    });

    /**
     * Create a new scenario
     * POST /api/scenarios
     */
    router.post('/', async (req, res) => {
        try {
            const { name, description, initial_message, atmosphere, background_image_url, background_image_filename, uses_custom_background,
                narrator_enabled, narrator_ai_provider, narrator_ai_model, narrator_temperature, narrator_max_tokens,
                narrator_trigger_mode, narrator_interval, narrator_personality } = req.body;

            if (!name || !description || !initial_message) {
                return res.status(400).json({
                    error: 'Name, description, and initial message are required fields'
                });
            }

            // Validate narrator settings if enabled
            if (narrator_enabled) {
                const validProviders = ['openai', 'anthropic', 'openrouter', 'google', 'ollama', 'lmstudio', 'custom', 'token'];
                if (!narrator_ai_provider || !validProviders.includes(narrator_ai_provider)) {
                    return res.status(400).json({ error: 'Valid narrator AI provider is required when narrator is enabled' });
                }
                if (!narrator_ai_model) {
                    return res.status(400).json({ error: 'Narrator AI model is required when narrator is enabled' });
                }
                const validModes = ['manual', 'auto_interval', 'scene_change', 'action_based'];
                if (narrator_trigger_mode && !validModes.includes(narrator_trigger_mode)) {
                    return res.status(400).json({ error: 'Invalid narrator trigger mode' });
                }
            }

            const scenario = await db.createScenario(req.userId, {
                name: name.trim(),
                description: description.trim(),
                initial_message: initial_message.trim(),
                atmosphere: atmosphere?.trim() || 'neutral',
                background_image_url,
                background_image_filename,
                uses_custom_background,
                narrator_enabled: narrator_enabled || false,
                narrator_ai_provider,
                narrator_ai_model,
                narrator_temperature,
                narrator_max_tokens,
                narrator_trigger_mode: narrator_trigger_mode || 'manual',
                narrator_interval: narrator_interval || 5,
                narrator_personality
            });

            res.status(201).json({
                ...scenario,
                message: 'Scene created successfully'
            });

        } catch (error) {
            console.error('Error creating scenario:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Scene name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to create scenario' });
        }
    });

    /**
     * Update a scenario
     * PUT /api/scenarios/:id
     */
    router.put('/:id', async (req, res) => {
        try {
            const { name, description, initial_message, atmosphere, background_image_url, background_image_filename, uses_custom_background,
                narrator_enabled, narrator_ai_provider, narrator_ai_model, narrator_temperature, narrator_max_tokens,
                narrator_trigger_mode, narrator_interval, narrator_personality } = req.body;

            if (!name || !description || !initial_message) {
                return res.status(400).json({
                    error: 'Name, description, and initial message are required fields'
                });
            }

            // Validate narrator settings if enabled
            if (narrator_enabled) {
                const validProviders = ['openai', 'anthropic', 'openrouter', 'google', 'ollama', 'lmstudio', 'custom', 'token'];
                if (!narrator_ai_provider || !validProviders.includes(narrator_ai_provider)) {
                    return res.status(400).json({ error: 'Valid narrator AI provider is required when narrator is enabled' });
                }
                if (!narrator_ai_model) {
                    return res.status(400).json({ error: 'Narrator AI model is required when narrator is enabled' });
                }
            }

            const scenario = await db.updateScenario(req.userId, req.params.id, {
                name: name.trim(),
                description: description.trim(),
                initial_message: initial_message.trim(),
                atmosphere: atmosphere?.trim(),
                background_image_url,
                background_image_filename,
                uses_custom_background,
                narrator_enabled,
                narrator_ai_provider,
                narrator_ai_model,
                narrator_temperature,
                narrator_max_tokens,
                narrator_trigger_mode,
                narrator_interval,
                narrator_personality
            });

            res.json({
                ...scenario,
                message: 'Scene updated successfully'
            });

        } catch (error) {
            console.error('Error updating scenario:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Scene name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to update scenario' });
        }
    });

    /**
     * Delete a scenario
     * DELETE /api/scenarios/:id
     */
    router.delete('/:id', async (req, res) => {
        try {
            const result = await db.deleteScenario(req.userId, req.params.id);
            res.json(result);
        } catch (error) {
            console.error('Error deleting scenario:', error);

            // Return specific error message if it's about published scene
            if (error.message && error.message.includes('published')) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to delete scenario' });
        }
    });

    /**
     * Generate narrator response for a scene
     * POST /api/scenarios/:id/narrator
     */
    router.post('/:id/narrator', async (req, res) => {
        try {
            const { messages, messageCount, lastAction } = req.body;
            const scenarios = await db.getScenarios(req.userId);
            const scene = scenarios.scenarios?.find(s => s.id === req.params.id);

            if (!scene || !scene.narrator_enabled) {
                return res.status(400).json({ error: 'Narrator not enabled for this scene' });
            }

            // Check trigger conditions
            let shouldTrigger = false;
            switch (scene.narrator_trigger_mode) {
                case 'auto_interval':
                    shouldTrigger = messageCount % (scene.narrator_interval || 5) === 0;
                    break;
                case 'action_based':
                    shouldTrigger = lastAction && /\*.*\*/.test(lastAction);
                    break;
                case 'scene_change':
                    shouldTrigger = lastAction && /(enter|leave|move|go to|arrive)/i.test(lastAction);
                    break;
                case 'manual':
                default:
                    shouldTrigger = false;
            }

            if (!shouldTrigger) {
                return res.json({ triggered: false });
            }

            const AIProviderService = require('../services/AIProviderService');
            const userSettings = await db.getUserSettings(req.userId);

            // Check if narrator model is a token model and resolve it
            let narratorAsCharacter = {
                name: 'Narrator',
                ai_provider: scene.narrator_ai_provider,
                ai_model: scene.narrator_ai_model,
                temperature: scene.narrator_temperature || 0.7,
                max_tokens: scene.narrator_max_tokens || 100
            };
            
            let modelCost = null;
            let useServerKeys = false;
            let adminApiKeys = {};
            let tokenModel = null; // Declare tokenModel in outer scope for analytics
            
            if (scene.narrator_ai_provider === 'token') {
              // Resolve token model from Supabase
              const allTokenModels = await supabaseTokenService.getTokenModels(true);
              tokenModel = allTokenModels.find(m => m.id === scene.narrator_ai_model || m.name === scene.narrator_ai_model);
              
              if (!tokenModel) {
                return res.status(404).json({ 
                  triggered: false,
                  error: `Token model not found: ${scene.narrator_ai_model}`
                });
              }
              
              modelCost = tokenModel.token_cost;
              useServerKeys = true;
              
              // Get admin API keys from Supabase
              const adminKeys = await supabaseTokenService.getAdminApiKeys(req.userId);
              
              adminApiKeys = {
                openai: adminKeys.openai_key,
                anthropic: adminKeys.anthropic_key,
                google: adminKeys.google_key,
                openrouter: adminKeys.openrouter_key
              };
              
              // Verify admin has the required key
              if (!adminApiKeys[tokenModel.ai_provider]) {
                return res.status(400).json({ 
                  triggered: false,
                  error: `Admin API key not configured for ${tokenModel.ai_provider}. Please add it in Admin Settings.`
                });
              }
              
              // Check balance before generating
              const userBalance = await supabaseTokenService.getUserTokens(req.userId);
              if (userBalance.balance < modelCost) {
                return res.status(402).json({ 
                  triggered: false,
                  error: `Insufficient tokens for narrator. Need ${modelCost} tokens, you have ${userBalance.balance}.`,
                  requiredTokens: modelCost
                });
              }
              
              // Update narrator with actual provider and model
              narratorAsCharacter = {
                ...narratorAsCharacter,
                ai_provider: tokenModel.ai_provider,
                ai_model: tokenModel.model_id,
                temperature: tokenModel.temperature,
                max_tokens: tokenModel.max_tokens
              };
              
              console.log(`[Narrator Token] Using token model: ${tokenModel.display_name} (${tokenModel.ai_provider}/${tokenModel.model_id}) - Cost: ${modelCost} tokens`);
            }

            let narratorPrompt = `You are the narrator for this scene: ${scene.name}

SCENE DESCRIPTION:
${scene.description}

ATMOSPHERE:
${scene.atmosphere || 'neutral'}`;

            if (scene.narrator_personality) {
                narratorPrompt += `\n\nNARRATOR STYLE:\n${scene.narrator_personality}`;
            }

            narratorPrompt += `\n\nYour role is to:
- Describe environmental changes and atmosphere
- Introduce new elements or events
- Set the mood and pacing
- Provide context without speaking for the characters
- Use italics for narration: *text here*

Keep responses brief (1-2 sentences). Focus on what's happening in the scene, not character dialogue.`;

            const response = await AIProviderService.generateResponse(
                narratorAsCharacter,
                [{ role: 'system', content: narratorPrompt }, ...(messages || []).slice(-10)],
                useServerKeys ? adminApiKeys : (userSettings?.apiKeys || {}),
                userSettings?.ollamaSettings || {},
                { useServerKeys: false }
            );

            // Deduct tokens if it was a token model
            if (useServerKeys && modelCost > 0) {
              // Calculate estimated API cost
              const estimatedApiCost = (modelCost / 500) * (tokenModel.provider_cost_per_500_tokens || 0);
              
              const result = await supabaseTokenService.deductTokens(
                req.userId,
                modelCost,
                `Narrator in ${scene.name}`,
                tokenModel.id, // model_id for analytics
                estimatedApiCost, // api_cost_usd
                tokenModel.provider_cost_per_500_tokens // provider_cost_per_500_tokens
              );
              console.log(`[Narrator Token] Deducted ${modelCost} tokens. New balance: ${result.new_balance}`);
            }

            res.json({ triggered: true, response, scene: scene.name });

        } catch (error) {
            console.error('Error generating narrator response:', error);
            res.status(500).json({ error: 'Failed to generate narrator response' });
        }
    });

    return router;
};
