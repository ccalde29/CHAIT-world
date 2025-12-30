// ============================================================================
// Model Pricing Routes
// Fetch and display pricing data for AI models
// ============================================================================

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { requireAdmin } = require('../middleware/adminAuth');
const supabaseService = require('../services/SupabaseAdminTokenService');
const LivePricingService = require('../services/LivePricingService');

// Static pricing data for major providers (per 1M tokens, as of Dec 2024)
const STATIC_PRICING = {
  openrouter: [
    { id: 'openai/gpt-4o', name: 'GPT-4o', input: 2.50, output: 10.00, per: '1M' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', input: 0.15, output: 0.60, per: '1M' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', input: 3.00, output: 15.00, per: '1M' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', input: 0.80, output: 4.00, per: '1M' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', input: 0.00, output: 0.00, per: 'FREE' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', input: 0.075, output: 0.30, per: '1M' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', input: 0.35, output: 0.40, per: '1M' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', input: 2.00, output: 6.00, per: '1M' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', input: 2.50, output: 10.00, per: '1M' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', input: 0.15, output: 0.60, per: '1M' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', input: 10.00, output: 30.00, per: '1M' },
    { id: 'gpt-4', name: 'GPT-4', input: 30.00, output: 60.00, per: '1M' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', input: 0.50, output: 1.50, per: '1M' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', input: 3.00, output: 15.00, per: '1M' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', input: 0.80, output: 4.00, per: '1M' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', input: 15.00, output: 75.00, per: '1M' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', input: 3.00, output: 15.00, per: '1M' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', input: 0.25, output: 1.25, per: '1M' }
  ],
  google: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', input: 0.00, output: 0.00, per: 'FREE' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', input: 0.075, output: 0.30, per: '1M' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', input: 0.0375, output: 0.15, per: '1M' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', input: 1.25, output: 5.00, per: '1M' }
  ]
};

/**
 * GET /api/pricing
 * Get pricing data for all providers (admin only)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pricing = {
      ...STATIC_PRICING
    };

    // Try to fetch live OpenRouter pricing
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();

        pricing.openrouter = data.data
          .filter(m => m.pricing) // Only models with pricing
          .map(m => {
            const inputCost = parseFloat(m.pricing.prompt) * 1000000; // Convert to per-1M
            const outputCost = parseFloat(m.pricing.completion) * 1000000;

            return {
              id: m.id,
              name: m.name,
              input: inputCost,
              output: outputCost,
              per: '1M',
              context: m.context_length,
              tier: inputCost === 0 ? 'free' : 'paid'
            };
          })
          .sort((a, b) => {
            // Sort by tier (free first), then by input price
            if (a.tier === 'free' && b.tier !== 'free') return -1;
            if (a.tier !== 'free' && b.tier === 'free') return 1;
            return a.input - b.input;
          });

        console.log(`[Pricing] Fetched ${pricing.openrouter.length} OpenRouter models`);
      } else {
        console.error('[Pricing] OpenRouter API returned status:', response.status);
        pricing.openrouter = [];
      }
    } catch (openRouterError) {
      console.error('[Pricing] Failed to fetch OpenRouter pricing:', openRouterError.message);
      // Use fallback empty array
      pricing.openrouter = [];
    }

    res.json({ pricing });

  } catch (error) {
    console.error('[Pricing] Error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
});

/**
 * GET /api/pricing/recommendations
 * Get pricing recommendations for model tiers (admin only)
 */
router.get('/recommendations', requireAdmin, async (req, res) => {
  try {
    // Get all token models
    const tokenModels = await supabaseService.getTokenModels(false); // include inactive
    
    // Get admin API keys - use the first admin user's keys
    const adminUsers = await supabaseService.getAdminUsers();
    let adminKeys = {};
    
    if (adminUsers && adminUsers.length > 0) {
      const keys = await supabaseService.getAdminApiKeys(adminUsers[0].user_id);
      if (keys) {
        adminKeys = {
          openrouter: keys.openrouter_key,
          openai: keys.openai_key,
          anthropic: keys.anthropic_key,
          google: keys.google_key
        };
      }
    }
    
    // Fetch live OpenRouter models
    let openrouterModels = [];
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        openrouterModels = data.data
          .filter(m => {
            if (!m.pricing) return false;
            
            // Filter for chat-capable models only
            const name = m.name.toLowerCase();
            const id = m.id.toLowerCase();
            
            // Exclude non-chat models
            const excludePatterns = [
              'vision', 'image', 'embedding', 'moderation', 'whisper', 
              'tts', 'dall-e', 'stable-diffusion', 'flux', 'sdxl'
            ];
            
            if (excludePatterns.some(pattern => name.includes(pattern) || id.includes(pattern))) {
              return false;
            }
            
            // Include models with chat/instruct indicators or general LLMs
            const includePatterns = [
              'chat', 'instruct', 'turbo', 'gpt', 'claude', 'llama', 
              'mistral', 'gemini', 'deepseek', 'qwen', 'mixtral', 'yi'
            ];
            
            return includePatterns.some(pattern => name.includes(pattern) || id.includes(pattern));
          })
          .sort((a, b) => {
            // Sort by popularity/price
            const aPrice = parseFloat(a.pricing.prompt);
            const bPrice = parseFloat(b.pricing.prompt);
            return aPrice - bPrice;
          })
          .map(m => ({
            id: m.id,
            name: m.name,
            input: parseFloat(m.pricing.prompt) * 1000000,
            output: parseFloat(m.pricing.completion) * 1000000,
            per: '1M',
            context: m.context_length
          }));
        
        console.log(`[Pricing] Fetched ${openrouterModels.length} chat-capable OpenRouter models`);
      }
    } catch (error) {
      console.error('[Pricing] Failed to fetch OpenRouter models, using static list:', error.message);
      // Fallback to static pricing if fetch fails
      openrouterModels = STATIC_PRICING.openrouter || [];
    }
    
    // Build provider pricing with live OpenRouter data
    const { openrouter: _, ...otherProviders } = STATIC_PRICING; // Exclude static openrouter
    const providerPricing = {
      openrouter: openrouterModels, // Use live data
      ...otherProviders // Add other providers
    };
    
    // Calculate recommendations for each provider
    const recommendations = {};
    
    console.log('[Pricing] Processing recommendations for', Object.keys(providerPricing).length, 'providers');
    console.log('[Pricing] Found', tokenModels.length, 'token models');
    
    for (const [provider, models] of Object.entries(providerPricing)) {
      recommendations[provider] = await Promise.all(
        models.map(async (model) => {
          // Get live pricing (cached for 24hrs)
          let costPer500 = null;
          const apiKey = adminKeys[provider];
          
          if (apiKey && provider !== 'ollama' && provider !== 'lmstudio') {
            try {
              costPer500 = await LivePricingService.getPricingFor500Tokens(provider, model.id, apiKey);
            } catch (error) {
              // Fall back to static calculation
              costPer500 = ((model.input + model.output) / 2) / 2000; // per 1M tokens to per 500 tokens
            }
          } else if (provider === 'ollama' || provider === 'lmstudio') {
            costPer500 = 0; // Local models are free
          } else {
            // No API key, use static calculation
            costPer500 = ((model.input + model.output) / 2) / 2000;
          }
          
          // Calculate recommended tier (2-3x markup for profit)
          let recommendedTier = 1;
          if (costPer500 > 0) {
            const targetRevenue = costPer500 * 2.5; // 2.5x markup
            if (targetRevenue <= 0.005) recommendedTier = 1;
            else if (targetRevenue <= 0.015) recommendedTier = 3;
            else if (targetRevenue <= 0.025) recommendedTier = 5;
            else recommendedTier = Math.ceil(targetRevenue / 0.005);
          }
          
          // Check if this model is in your token models
          const yourModel = tokenModels.find(tm => 
            tm.provider === provider && 
            (tm.model_id === model.id || tm.name.toLowerCase().includes(model.name.toLowerCase()))
          );
          
          const result = {
            ...model,
            costPer500Tokens: costPer500,
            recommendedTier,
            recommendedPrice: recommendedTier * 0.005,
            status: yourModel ? 'active' : 'available',
            profitMargin: null
          };
          
          if (yourModel) {
            const yourPrice = yourModel.tier * 0.005;
            const profit = yourPrice - costPer500;
            result.yourTier = yourModel.tier;
            result.yourPrice = yourPrice;
            result.profit = profit;
            result.profitMargin = costPer500 > 0 ? (profit / yourPrice) * 100 : 100;
            result.isProfitable = profit >= 0;
            result.modelId = yourModel.id;
            result.isActive = yourModel.is_active;
          }
          
          return result;
        })
      );
    }
    
    res.json({
      recommendations,
      tierPricing: {
        1: 0.005,
        3: 0.015,
        5: 0.025,
        7: 0.035,
        10: 0.050
      },
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Pricing] Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get pricing recommendations' });
  }
});

/**
 * GET /api/pricing/refresh
 * Force refresh OpenRouter pricing cache (admin only)
 */
router.get('/refresh', requireAdmin, async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(500).json({
        error: 'Failed to fetch from OpenRouter API',
        status: response.status
      });
    }

    const data = await response.json();
    const models = data.data
      .filter(m => m.pricing)
      .map(m => ({
        id: m.id,
        name: m.name,
        input: parseFloat(m.pricing.prompt) * 1000000,
        output: parseFloat(m.pricing.completion) * 1000000,
        per: '1M',
        context: m.context_length,
        tier: parseFloat(m.pricing.prompt) === 0 ? 'free' : 'paid'
      }));

    console.log(`[Pricing] Refreshed ${models.length} OpenRouter models`);

    res.json({
      success: true,
      models,
      count: models.length,
      message: 'OpenRouter pricing refreshed successfully'
    });

  } catch (error) {
    console.error('[Pricing] Error refreshing:', error);
    res.status(500).json({ error: 'Failed to refresh pricing data' });
  }
});

module.exports = router;
