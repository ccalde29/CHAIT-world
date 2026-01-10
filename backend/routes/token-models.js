// ============================================================================
// Token Models Routes (Admin Only)
// Manage admin-created AI model presets that use server API keys and cost tokens
// NOW USING SUPABASE (secure, server-controlled)
// ============================================================================

const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const supabaseService = require('../services/SupabaseAdminTokenService');

module.exports = (db) => {
  const router = express.Router();

  /**
   * GET /api/token-models
   * Get all active token models (available to all users)
   */
  router.get('/', async (req, res) => {
    try {
      const models = await supabaseService.getTokenModels(true); // true = active only
      res.json({ models: models || [] });
    } catch (error) {
      console.error('[TokenModels] Error fetching models:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/token-models/admin
   * Get all token models including inactive (admin only)
   */
  router.get('/admin', requireAdmin, async (req, res) => {
    try {
      const models = await supabaseService.getTokenModels(false); // false = all models
      res.json({ models: models || [] });
    } catch (error) {
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/token-models
   * Create a new token model (admin only)
   */
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const {
        name,
        display_name,
        description,
        ai_provider,
        model_id,
        token_cost,
        custom_system_prompt,
        temperature,
        max_tokens,
        tags
      } = req.body;

      // Validation
      if (!name || !display_name || !ai_provider || !model_id) {
        return res.status(400).json({
          error: 'Name, display name, AI provider, and model ID are required'
        });
      }

      const validProviders = ['openai', 'anthropic', 'google', 'openrouter'];
      if (!validProviders.includes(ai_provider)) {
        return res.status(400).json({
          error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
        });
      }

      if (token_cost !== undefined && (token_cost < 0 || token_cost > 100)) {
        return res.status(400).json({
          error: 'Token cost must be between 0 and 100'
        });
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
        return res.status(400).json({
          error: 'Temperature must be between 0.0 and 2.0'
        });
      }

      if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 1000)) {
        return res.status(400).json({
          error: 'Max tokens must be between 50 and 1000'
        });
      }

      const model = await supabaseService.createTokenModel({
        name: name.trim(),
        display_name: display_name.trim(),
        description: description?.trim() || null,
        ai_provider,
        model_id: model_id.trim(),
        token_cost: token_cost || 1,
        custom_system_prompt: custom_system_prompt?.trim() || null,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: max_tokens !== undefined ? max_tokens : 150,
        tags: tags || [],
        is_active: true
      });

      res.status(201).json({ model, message: 'Token model created successfully' });

    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A token model with this name already exists' });
      }
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/token-models/:id
   * Update a token model (admin only)
   */
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        display_name,
        description,
        ai_provider,
        model_id,
        token_cost,
        custom_system_prompt,
        temperature,
        max_tokens,
        tags,
        is_active
      } = req.body;

      // Validate if provided
      if (ai_provider) {
        const validProviders = ['openai', 'anthropic', 'google', 'openrouter'];
        if (!validProviders.includes(ai_provider)) {
          return res.status(400).json({
            error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
          });
        }
      }

      if (token_cost !== undefined && (token_cost < 0 || token_cost > 100)) {
        return res.status(400).json({ error: 'Token cost must be between 0 and 100' });
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
        return res.status(400).json({ error: 'Temperature must be between 0.0 and 2.0' });
      }

      if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 1000)) {
        return res.status(400).json({ error: 'Max tokens must be between 50 and 1000' });
      }

      // Build update object
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (display_name !== undefined) updates.display_name = display_name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (ai_provider !== undefined) updates.ai_provider = ai_provider;
      if (model_id !== undefined) updates.model_id = model_id.trim();
      if (token_cost !== undefined) updates.token_cost = token_cost;
      if (custom_system_prompt !== undefined) updates.custom_system_prompt = custom_system_prompt.trim();
      if (temperature !== undefined) updates.temperature = temperature;
      if (max_tokens !== undefined) updates.max_tokens = max_tokens;
      if (tags !== undefined) updates.tags = tags;
      if (is_active !== undefined) updates.is_active = is_active;

      const model = await supabaseService.updateTokenModel(id, updates);

      res.json({ model, message: 'Token model updated successfully' });

    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A token model with this name already exists' });
      }
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/token-models/:id
   * Delete a token model (admin only)
   */
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await supabaseService.deleteTokenModel(id);

      res.json({ success: true, message: 'Token model deleted successfully' });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Token model not found' });
      }
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/token-models/analytics
   * Get usage analytics for all token models (admin only)
   */
  router.get('/analytics', requireAdmin, async (req, res) => {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get all token models
      const models = await supabaseService.getTokenModels(false); // Include inactive

      // Get transactions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error: txError } = await supabase
        .from('token_transactions')
        .select('model_id, amount, api_cost_usd, provider_cost_per_500_tokens, type, created_at')
        .eq('type', 'usage')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('model_id', 'is', null);

      if (txError) {
        console.error('[TokenModels] Error fetching transactions:', txError);
      }

      // Group by provider and tier
      const analyticsData = {};

      for (const model of models) {
        const provider = model.ai_provider;
        const tier = model.token_cost; // Will be credit tier once migrated

        if (!analyticsData[provider]) {
          analyticsData[provider] = {};
        }

        if (!analyticsData[provider][tier]) {
          analyticsData[provider][tier] = [];
        }

        // Calculate stats for this model
        const modelTransactions = transactions?.filter(t => t.model_id === model.id) || [];
        const totalMessages = modelTransactions.length;
        const totalCreditsCollected = modelTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalApiCost = modelTransactions.reduce((sum, t) => sum + (t.api_cost_usd || 0), 0);
        const netProfit = (totalCreditsCollected * 0.005) - totalApiCost; // $0.005 per credit
        const avgCostPer500 = modelTransactions.length > 0 
          ? modelTransactions.reduce((sum, t) => sum + (t.provider_cost_per_500_tokens || 0), 0) / modelTransactions.length
          : 0;

        analyticsData[provider][tier].push({
          id: model.id,
          name: model.display_name,
          model_id: model.model_id,
          tier: model.token_cost,
          is_active: model.is_active,
          total_messages: totalMessages,
          total_credits_collected: totalCreditsCollected,
          total_api_cost_usd: totalApiCost,
          net_profit_usd: netProfit,
          avg_cost_per_500_tokens: avgCostPer500,
          is_profitable: netProfit >= 0
        });
      }

      res.json({ analytics: analyticsData });

    } catch (error) {
      console.error('[TokenModels] Analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/token-models/analytics/export
   * Export analytics as CSV (admin only)
   */
  router.get('/analytics/export', requireAdmin, async (req, res) => {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const models = await supabaseService.getTokenModels(false);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions } = await supabase
        .from('token_transactions')
        .select('model_id, amount, api_cost_usd, provider_cost_per_500_tokens')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('model_id', 'is', null);

      // Build CSV
      let csv = 'Provider,Tier,Model Name,Model ID,Total Messages,Credits Collected,API Cost (USD),Net Profit (USD),Avg Cost Per 500 Tokens,Profitable\n';

      for (const model of models) {
        const modelTransactions = transactions?.filter(t => t.model_id === model.id) || [];
        const totalMessages = modelTransactions.length;
        const totalCreditsCollected = modelTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalApiCost = modelTransactions.reduce((sum, t) => sum + (t.api_cost_usd || 0), 0);
        const netProfit = (totalCreditsCollected * 0.005) - totalApiCost;
        const avgCostPer500 = modelTransactions.length > 0 
          ? modelTransactions.reduce((sum, t) => sum + (t.provider_cost_per_500_tokens || 0), 0) / modelTransactions.length
          : 0;

        csv += `${model.ai_provider},${model.token_cost},"${model.display_name}",${model.model_id},${totalMessages},${totalCreditsCollected},${totalApiCost.toFixed(6)},${netProfit.toFixed(6)},${avgCostPer500.toFixed(6)},${netProfit >= 0 ? 'Yes' : 'No'}\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="token-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);

    } catch (error) {
      console.error('[TokenModels] Export error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/token-models/refresh-pricing
   * Force refresh all pricing from provider APIs (admin only)
   */
  router.post('/refresh-pricing', requireAdmin, async (req, res) => {
    try {
      const userId = req.headers['user-id'];
      
      // Get admin API keys
      const adminKeys = await supabaseService.getAdminApiKeys(userId);
      const apiKeys = {
        openai: adminKeys.openai_key,
        anthropic: adminKeys.anthropic_key,
        google: adminKeys.google_key,
        openrouter: adminKeys.openrouter_key
      };

      const LivePricingService = require('../services/LivePricingService');
      const pricingService = LivePricingService.getInstance();
      
      const results = await pricingService.refreshAllPricing(apiKeys);

      res.json({ 
        success: true, 
        message: 'Pricing refresh completed',
        results 
      });

    } catch (error) {
      console.error('[TokenModels] Pricing refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
