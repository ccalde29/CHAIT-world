// ============================================================================
// Token Routes
// Manage user token balances and transactions
// ============================================================================

const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const TokenService = require('../services/TokenService');

module.exports = (db) => {
    const router = express.Router();
    const tokenService = new TokenService(db);

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

            // Check for weekly refill
            const refillResult = tokenService.processWeeklyRefill(userId, 100);
            
            // Get current balance
            const balance = tokenService.getUserBalance(userId);

            res.json({
                balance: balance.balance,
                lifetime_earned: balance.lifetime_earned,
                lifetime_purchased: balance.lifetime_purchased,
                last_weekly_refill: balance.last_weekly_refill,
                refill_info: refillResult
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
            const transactions = tokenService.getTransactions(userId, limit);

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
            const adminId = req.headers['user-id'];
            const { userId, amount } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid userId and positive amount required' });
            }

            const newBalance = tokenService.adminGrantTokens(userId, amount, adminId);

            res.json({
                success: true,
                message: `Granted ${amount} tokens to user ${userId}`,
                newBalance
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
            const adminId = req.headers['user-id'];
            const { userId, amount } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid userId and positive amount required' });
            }

            const newBalance = tokenService.adminDeductTokens(userId, amount, adminId);

            res.json({
                success: true,
                message: `Deducted ${amount} tokens from user ${userId}`,
                newBalance
            });
        } catch (error) {
            console.error('[Tokens] Error deducting tokens:', error);
            res.status(500).json({ error: 'Failed to deduct tokens' });
        }
    });

    /**
     * POST /api/tokens/admin/set-balance
     * Set exact balance for a user (admin only)
     */
    router.post('/admin/set-balance', requireAdmin, async (req, res) => {
        try {
            const adminId = req.headers['user-id'];
            const { userId, balance } = req.body;

            if (!userId || balance === undefined || balance < 0) {
                return res.status(400).json({ error: 'Valid userId and non-negative balance required' });
            }

            const newBalance = tokenService.adminSetBalance(userId, balance, adminId);

            res.json({
                success: true,
                message: `Set balance for user ${userId} to ${balance}`,
                newBalance
            });
        } catch (error) {
            console.error('[Tokens] Error setting balance:', error);
            res.status(500).json({ error: 'Failed to set balance' });
        }
    });

    /**
     * GET /api/tokens/admin/all-balances
     * Get all users' token balances (admin only)
     */
    router.get('/admin/all-balances', requireAdmin, async (req, res) => {
        try {
            const balances = tokenService.getAllBalances();

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
            const cost = tokenService.getModelCost(modelId);

            if (cost === null) {
                return res.json({ isTokenModel: false, cost: 0 });
            }

            res.json({ isTokenModel: true, cost });
        } catch (error) {
            console.error('[Tokens] Error getting model cost:', error);
            res.status(500).json({ error: 'Failed to get model cost' });
        }
    });

    return router;
};
