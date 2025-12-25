// ============================================================================
// Token Routes
// Manage user token balances and transactions
// NOW USING SUPABASE (secure, server-controlled)
// ============================================================================

const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const supabaseService = require('../services/SupabaseAdminTokenService');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/tokens/balance
     * Get current user's token balance
     */
    router.get('/balance', async (req, res) => {
        try {
            const userId = req.headers['user-id'];
            
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            // Get current balance from Supabase
            const balance = await supabaseService.getUserTokens(userId);

            res.json({
                balance: balance.balance,
                lifetime_earned: balance.lifetime_earned,
                lifetime_purchased: balance.lifetime_purchased,
                last_weekly_refill: balance.last_weekly_refill
            });
        } catch (error) {
            console.error('[Tokens] Error getting balance:', error);
            res.status(500).json({ error: 'Failed to get token balance' });
        }
    });

    /**
     * GET /api/tokens/transactions
     * Get user's transaction history
     */
    router.get('/transactions', async (req, res) => {
        try {
            const userId = req.headers['user-id'];
            
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const limit = parseInt(req.query.limit) || 50;
            const transactions = await supabaseService.getUserTransactions(userId, limit);

            res.json({ transactions });
        } catch (error) {
            console.error('[Tokens] Error getting transactions:', error);
            res.status(500).json({ error: 'Failed to get transactions' });
        }
    });

    /**
     * POST /api/tokens/admin/grant
     * Grant tokens to a user (admin only)
     */
    router.post('/admin/grant', requireAdmin, async (req, res) => {
        try {
            const { userId, amount } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid userId and positive amount required' });
            }

            const result = await supabaseService.grantTokens(
                userId,
                amount,
                'admin_grant',
                `Granted by admin`
            );

            res.json({
                message: 'Tokens granted successfully',
                newBalance: result.new_balance
            });
        } catch (error) {
            console.error('[Tokens] Error granting tokens:', error);
            res.status(500).json({ error: 'Failed to grant tokens' });
        }
    });

    /**
     * POST /api/tokens/admin/deduct
     * Deduct tokens from a user (admin only)
     */
    router.post('/admin/deduct', requireAdmin, async (req, res) => {
        try {
            const { userId, amount } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid userId and positive amount required' });
            }

            const result = await supabaseService.deductTokens(
                userId,
                amount,
                'admin_deduct',
                `Deducted by admin`
            );

            res.json({
                message: 'Tokens deducted successfully',
                newBalance: result.new_balance
            });
        } catch (error) {
            console.error('[Tokens] Error deducting tokens:', error);
            res.status(500).json({ error: error.message || 'Failed to deduct tokens' });
        }
    });



    /**
     * GET /api/tokens/admin/all-balances
     * Get all users' token balances (admin only)
     */
    router.get('/admin/all-balances', requireAdmin, async (req, res) => {
        try {
            const balances = await supabaseService.getAllUserBalances();
            res.json({ balances });
        } catch (error) {
            console.error('[Tokens] Error getting all balances:', error);
            res.status(500).json({ error: 'Failed to get balances' });
        }
    });

    /**
     * GET /api/tokens/model-cost/:modelId
     * Get token cost for a specific model
     */
    router.get('/model-cost/:modelId', async (req, res) => {
        try {
            const { modelId } = req.params;
            const models = await supabaseService.getTokenModels(true);
            const model = models.find(m => m.name === modelId);

            if (!model) {
                return res.json({ isTokenModel: false, cost: 0 });
            }

            res.json({ isTokenModel: true, cost: model.token_cost });
        } catch (error) {
            console.error('[Tokens] Error getting model cost:', error);
            res.status(500).json({ error: 'Failed to get model cost' });
        }
    });

    return router;
};
