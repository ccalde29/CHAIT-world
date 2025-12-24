// ============================================================================
// Token Service
// Manages user token balances, transactions, and weekly refills
// ============================================================================

class TokenService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get user's token balance, create if doesn't exist
     */
    getUserBalance(userId) {
        try {
            let balance = this.db.localDb.get('SELECT * FROM user_tokens WHERE user_id = ?', [userId]);
            
            if (!balance) {
                // Create initial balance with 100 free tokens
                this.db.localDb.run(
                    `INSERT INTO user_tokens (user_id, balance, lifetime_earned) 
                     VALUES (?, 100, 100)`,
                    [userId]
                );
                balance = this.db.localDb.get('SELECT * FROM user_tokens WHERE user_id = ?', [userId]);
            }

            return balance;
        } catch (error) {
            console.error('[TokenService] Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Check if user has enough tokens
     */
    hasEnoughTokens(userId, cost) {
        const balance = this.getUserBalance(userId);
        return balance.balance >= cost;
    }

    /**
     * Deduct tokens from user's balance
     */
    deductTokens(userId, cost, reference = null) {
        try {
            const balance = this.getUserBalance(userId);
            
            if (balance.balance < cost) {
                throw new Error(`Insufficient tokens. Need ${cost}, have ${balance.balance}`);
            }

            const newBalance = balance.balance - cost;

            // Update balance
            this.db.localDb.run(
                'UPDATE user_tokens SET balance = ? WHERE user_id = ?',
                [newBalance, userId]
            );

            // Record transaction
            this.recordTransaction(userId, -cost, 'usage', reference, newBalance);

            console.log(`[TokenService] Deducted ${cost} tokens from ${userId}. New balance: ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error('[TokenService] Error deducting tokens:', error);
            throw error;
        }
    }

    /**
     * Add tokens to user's balance
     */
    addTokens(userId, amount, type = 'admin_grant', reference = null) {
        try {
            const balance = this.getUserBalance(userId);
            const newBalance = balance.balance + amount;

            // Update balance
            this.db.localDb.run(
                'UPDATE user_tokens SET balance = ? WHERE user_id = ?',
                [newBalance, userId]
            );

            // Update lifetime counters
            if (type === 'weekly_refill' || type === 'admin_grant') {
                this.db.localDb.run(
                    'UPDATE user_tokens SET lifetime_earned = lifetime_earned + ? WHERE user_id = ?',
                    [amount, userId]
                );
            } else if (type === 'purchase') {
                this.db.localDb.run(
                    'UPDATE user_tokens SET lifetime_purchased = lifetime_purchased + ? WHERE user_id = ?',
                    [amount, userId]
                );
            }

            // Record transaction
            this.recordTransaction(userId, amount, type, reference, newBalance);

            console.log(`[TokenService] Added ${amount} tokens to ${userId}. New balance: ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error('[TokenService] Error adding tokens:', error);
            throw error;
        }
    }

    /**
     * Admin: Grant tokens to user
     */
    adminGrantTokens(userId, amount, adminId) {
        return this.addTokens(userId, amount, 'admin_grant', `admin:${adminId}`);
    }

    /**
     * Admin: Deduct tokens from user
     */
    adminDeductTokens(userId, amount, adminId) {
        try {
            const balance = this.getUserBalance(userId);
            const newBalance = Math.max(0, balance.balance - amount);
            const actualDeduction = balance.balance - newBalance;

            // Update balance
            this.db.localDb.run(
                'UPDATE user_tokens SET balance = ? WHERE user_id = ?',
                [newBalance, userId]
            );

            // Record transaction
            this.recordTransaction(userId, -actualDeduction, 'admin_deduct', `admin:${adminId}`, newBalance);

            console.log(`[TokenService] Admin deducted ${actualDeduction} tokens from ${userId}. New balance: ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error('[TokenService] Error in admin deduction:', error);
            throw error;
        }
    }

    /**
     * Set exact balance (admin only)
     */
    adminSetBalance(userId, newBalance, adminId) {
        try {
            const currentBalance = this.getUserBalance(userId);
            const difference = newBalance - currentBalance.balance;

            // Update balance
            this.db.localDb.run(
                'UPDATE user_tokens SET balance = ? WHERE user_id = ?',
                [newBalance, userId]
            );

            // Record transaction
            const type = difference >= 0 ? 'admin_grant' : 'admin_deduct';
            this.recordTransaction(userId, difference, type, `admin:${adminId}:set_balance`, newBalance);

            console.log(`[TokenService] Admin set balance for ${userId} to ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error('[TokenService] Error setting balance:', error);
            throw error;
        }
    }

    /**
     * Process weekly refill if due
     */
    processWeeklyRefill(userId, refillAmount = 100) {
        try {
            const balance = this.getUserBalance(userId);
            const lastRefill = new Date(balance.last_weekly_refill);
            const now = new Date();
            const daysSinceRefill = (now - lastRefill) / (1000 * 60 * 60 * 24);

            // Refill if it's been 7 days or more
            if (daysSinceRefill >= 7) {
                const newBalance = balance.balance + refillAmount;

                this.db.localDb.run(
                    `UPDATE user_tokens 
                     SET balance = ?, 
                         lifetime_earned = lifetime_earned + ?,
                         last_weekly_refill = CURRENT_TIMESTAMP 
                     WHERE user_id = ?`,
                    [newBalance, refillAmount, userId]
                );

                this.recordTransaction(userId, refillAmount, 'weekly_refill', null, newBalance);

                console.log(`[TokenService] Weekly refill for ${userId}: +${refillAmount} tokens. New balance: ${newBalance}`);
                return { refilled: true, amount: refillAmount, newBalance };
            }

            return { refilled: false, nextRefill: new Date(lastRefill.getTime() + 7 * 24 * 60 * 60 * 1000) };
        } catch (error) {
            console.error('[TokenService] Error processing weekly refill:', error);
            throw error;
        }
    }

    /**
     * Record a token transaction
     */
    recordTransaction(userId, amount, type, reference, balanceAfter) {
        try {
            this.db.localDb.run(
                `INSERT INTO token_transactions (user_id, amount, type, reference, balance_after)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, amount, type, reference, balanceAfter]
            );
        } catch (error) {
            console.error('[TokenService] Error recording transaction:', error);
            // Don't throw - transaction history is not critical
        }
    }

    /**
     * Get user's transaction history
     */
    getTransactions(userId, limit = 50) {
        try {
            return this.db.localDb.all(
                `SELECT * FROM token_transactions 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [userId, limit]
            );
        } catch (error) {
            console.error('[TokenService] Error getting transactions:', error);
            return [];
        }
    }

    /**
     * Get all users' token balances (admin only)
     */
    getAllBalances() {
        try {
            return this.db.localDb.all(
                'SELECT * FROM user_tokens ORDER BY balance DESC'
            );
        } catch (error) {
            console.error('[TokenService] Error getting all balances:', error);
            return [];
        }
    }

    /**
     * Get token model by ID
     */
    getTokenModel(modelId) {
        try {
            return this.db.localDb.get(
                'SELECT * FROM token_models WHERE id = ? AND is_active = 1',
                [modelId]
            );
        } catch (error) {
            console.error('[TokenService] Error getting token model:', error);
            return null;
        }
    }

    /**
     * Get token model by name
     */
    getTokenModelByName(name) {
        try {
            return this.db.localDb.get(
                'SELECT * FROM token_models WHERE name = ? AND is_active = 1',
                [name]
            );
        } catch (error) {
            console.error('[TokenService] Error getting token model by name:', error);
            return null;
        }
    }

    /**
     * Check if a model is a token model and return its cost
     */
    getModelCost(modelIdentifier) {
        try {
            // Try by ID first
            let model = this.getTokenModel(modelIdentifier);
            
            // Try by name if not found
            if (!model) {
                model = this.getTokenModelByName(modelIdentifier);
            }

            return model ? model.token_cost : null;
        } catch (error) {
            console.error('[TokenService] Error getting model cost:', error);
            return null;
        }
    }
}

module.exports = TokenService;
