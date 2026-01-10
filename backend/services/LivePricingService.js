// ============================================================================
// Live Pricing Service
// Fetches current API pricing from providers with 24hr cache
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

class LivePricingService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.CACHE_DURATION_HOURS = 24;
    }

    /**
     * Get pricing for a specific model, using cache if fresh
     */
    async getPricingFor500Tokens(provider, modelId, adminApiKey) {
        try {
            // Check cache first
            const cached = await this.getCachedPricing(provider, modelId);
            if (cached && this.isCacheFresh(cached.last_updated)) {

                return cached.cost_per_500_tokens;
            }

            // Fetch fresh pricing
            const cost = await this.fetchLivePricing(provider, modelId, adminApiKey);
            
            // Update cache
            await this.updateCache(provider, modelId, cost);

            return cost;

        } catch (error) {
            console.error(`[Pricing] Error fetching pricing for ${provider}/${modelId}:`, error);
            
            // Fallback to cached value even if stale
            const cached = await this.getCachedPricing(provider, modelId);
            if (cached) {

                return cached.cost_per_500_tokens;
            }
            
            // Last resort: estimate based on typical pricing
            return this.getEstimatedPricing(provider, modelId);
        }
    }

    /**
     * Get cached pricing from database
     */
    async getCachedPricing(provider, modelId) {
        const { data } = await this.supabase
            .from('provider_pricing_cache')
            .select('*')
            .eq('provider', provider)
            .eq('model_identifier', modelId)
            .single();

        return data;
    }

    /**
     * Check if cache is still fresh (< 24hrs old)
     */
    isCacheFresh(lastUpdated) {
        const ageHours = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
        return ageHours < this.CACHE_DURATION_HOURS;
    }

    /**
     * Fetch live pricing from provider APIs
     */
    async fetchLivePricing(provider, modelId, adminApiKey) {
        switch (provider.toLowerCase()) {
            case 'openrouter':
                return await this.fetchOpenRouterPricing(modelId, adminApiKey);
            
            case 'openai':
                return await this.fetchOpenAIPricing(modelId);
            
            case 'anthropic':
                return await this.fetchAnthropicPricing(modelId);
            
            case 'google':
                return await this.fetchGooglePricing(modelId);
            
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * OpenRouter pricing - fetch from their models API
     */
    async fetchOpenRouterPricing(modelId, apiKey) {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3001',
                'X-Title': 'CHAIT World'
            }
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const { data } = await response.json();
        const model = data.find(m => m.id === modelId);
        
        if (!model || !model.pricing) {
            throw new Error(`Model not found or no pricing: ${modelId}`);
        }

        // OpenRouter returns pricing per million tokens, convert to per 500 tokens
        // Assume average of input and output pricing
        const inputCostPer1M = parseFloat(model.pricing.prompt) || 0;
        const outputCostPer1M = parseFloat(model.pricing.completion) || 0;
        const avgCostPer1M = (inputCostPer1M + outputCostPer1M) / 2;
        
        return (avgCostPer1M / 1000000) * 500;
    }

    /**
     * OpenAI pricing - static rates (update as needed)
     */
    async fetchOpenAIPricing(modelId) {
        const pricingMap = {
            'gpt-4o': { input: 2.50, output: 10.00 },
            'gpt-4o-mini': { input: 0.150, output: 0.600 },
            'gpt-4-turbo': { input: 10.00, output: 30.00 },
            'gpt-4': { input: 30.00, output: 60.00 },
            'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
        };

        const pricing = pricingMap[modelId];
        if (!pricing) {
            throw new Error(`Unknown OpenAI model: ${modelId}`);
        }

        // Prices are per 1M tokens, convert to per 500 tokens
        const avgCostPer1M = (pricing.input + pricing.output) / 2;
        return (avgCostPer1M / 1000000) * 500;
    }

    /**
     * Anthropic pricing - static rates
     */
    async fetchAnthropicPricing(modelId) {
        const pricingMap = {
            'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
            'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
            'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
            'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
            'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
        };

        const pricing = pricingMap[modelId];
        if (!pricing) {
            throw new Error(`Unknown Anthropic model: ${modelId}`);
        }

        // Prices are per 1M tokens
        const avgCostPer1M = (pricing.input + pricing.output) / 2;
        return (avgCostPer1M / 1000000) * 500;
    }

    /**
     * Google pricing - static rates
     */
    async fetchGooglePricing(modelId) {
        const pricingMap = {
            'gemini-1.5-pro': { input: 1.25, output: 5.00 },
            'gemini-1.5-flash': { input: 0.075, output: 0.30 },
            'gemini-1.0-pro': { input: 0.50, output: 1.50 }
        };

        const pricing = pricingMap[modelId];
        if (!pricing) {
            throw new Error(`Unknown Google model: ${modelId}`);
        }

        // Prices are per 1M tokens
        const avgCostPer1M = (pricing.input + pricing.output) / 2;
        return (avgCostPer1M / 1000000) * 500;
    }

    /**
     * Update cache in database
     */
    async updateCache(provider, modelId, cost) {
        await this.supabase
            .from('provider_pricing_cache')
            .upsert({
                provider,
                model_identifier: modelId,
                cost_per_500_tokens: cost,
                last_updated: new Date().toISOString()
            }, {
                onConflict: 'provider,model_identifier'
            });
    }

    /**
     * Force refresh all cached pricing
     */
    async refreshAllPricing(adminApiKeys) {

        const SupabaseAdminTokenService = require('./SupabaseAdminTokenService');
        const models = await SupabaseAdminTokenService.getTokenModels(true);

        const results = [];
        for (const model of models) {
            try {
                const apiKey = adminApiKeys[model.ai_provider];
                const cost = await this.fetchLivePricing(model.ai_provider, model.model_id, apiKey);
                await this.updateCache(model.ai_provider, model.model_id, cost);
                results.push({ model: model.model_id, success: true, cost });
            } catch (error) {
                console.error(`Failed to refresh ${model.model_id}:`, error.message);
                results.push({ model: model.model_id, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Fallback estimated pricing if all else fails
     */
    getEstimatedPricing(provider, modelId) {
        console.warn(`[Pricing] Using estimated pricing for ${provider}/${modelId}`);
        
        // Conservative estimates per 500 tokens
        if (modelId.includes('gpt-4')) return 0.015;
        if (modelId.includes('gpt-3.5')) return 0.0005;
        if (modelId.includes('claude-3-opus')) return 0.02;
        if (modelId.includes('claude')) return 0.004;
        if (modelId.includes('gemini')) return 0.002;
        
        return 0.005; // Default estimate
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new LivePricingService();
        }
        return instance;
    }
};
