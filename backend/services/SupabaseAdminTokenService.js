/**
 * Supabase Admin & Token Service
 * Handles all admin and token operations through Supabase
 * Replaces LocalDatabaseService for security-critical operations
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseAdminTokenService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }

        // Use service role key for admin operations
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // ============================================================================
    // ADMIN OPERATIONS
    // ============================================================================

    /**
     * Check if user is admin
     */
    async isAdmin(userId) {
        try {
            const { data, error } = await this.supabase
                .from('admin_users')
                .select('user_id')
                .eq('user_id', userId)
                .single();

            return !error && data !== null;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    /**
     * Get all admin users
     */
    async getAdminUsers() {
        const { data, error } = await this.supabase
            .from('admin_users')
            .select('*')
            .order('granted_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Grant admin access
     */
    async grantAdmin(userId, grantedBy, notes = null) {
        const { data, error } = await this.supabase
            .from('admin_users')
            .upsert({
                user_id: userId,
                granted_by: grantedBy,
                notes: notes
            });

        if (error) throw error;
        return data;
    }

    /**
     * Revoke admin access
     */
    async revokeAdmin(userId) {
        const { data, error } = await this.supabase
            .from('admin_users')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    }

    /**
     * Get admin settings (auto_approve_characters, admin_system_prompt)
     */
    async getAdminSettings(userId) {
        const { data, error } = await this.supabase
            .from('admin_users')
            .select('auto_approve_characters, admin_system_prompt')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User is not admin
                return {
                    auto_approve_characters: false,
                    admin_system_prompt: null
                };
            }
            throw error;
        }

        return {
            auto_approve_characters: data?.auto_approve_characters || false,
            admin_system_prompt: data?.admin_system_prompt || null
        };
    }

    /**
     * Update admin settings
     */
    async updateAdminSettings(userId, settings) {
        const updateData = {};
        
        if (settings.auto_approve_characters !== undefined) {
            updateData.auto_approve_characters = settings.auto_approve_characters;
        }
        
        if (settings.admin_system_prompt !== undefined) {
            updateData.admin_system_prompt = settings.admin_system_prompt || null;
        }

        const { data, error } = await this.supabase
            .from('admin_users')
            .update(updateData)
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    }

    // ============================================================================
    // ADMIN API KEYS
    // ============================================================================

    /**
     * Get admin API keys (encrypted)
     */
    async getAdminApiKeys(userId) {
        const { data, error } = await this.supabase
            .from('admin_api_keys')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data;
    }

    /**
     * Save admin API keys
     */
    async saveAdminApiKeys(userId, keys) {
        // Get existing keys first
        const existing = await this.getAdminApiKeys(userId);
        
        // Merge with new keys (only update keys that are provided)
        const merged = {
            user_id: userId,
            openai_key: keys.openai !== undefined ? keys.openai : existing.openai,
            anthropic_key: keys.anthropic !== undefined ? keys.anthropic : existing.anthropic,
            google_key: keys.google !== undefined ? keys.google : existing.google,
            openrouter_key: keys.openrouter !== undefined ? keys.openrouter : existing.openrouter
        };

        const { data, error } = await this.supabase
            .from('admin_api_keys')
            .upsert(merged);

        if (error) throw error;
        return data;
    }

    /**
     * Delete admin API keys
     */
    async deleteAdminApiKeys(userId) {
        const { data, error } = await this.supabase
            .from('admin_api_keys')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    }

    // ============================================================================
    // TOKEN MODELS
    // ============================================================================

    /**
     * Get all token models
     */
    async getTokenModels(activeOnly = false) {
        let query = this.supabase
            .from('token_models')
            .select('*')
            .order('display_name');

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Ensure tags is always an array - handle both string and array formats
        return (data || []).map(model => ({
            ...model,
            tags: this.parseTags(model.tags)
        }));
    }

    /**
     * Helper to parse tags from various formats
     */
    parseTags(tags) {
        if (Array.isArray(tags)) {
            return tags;
        }
        if (typeof tags === 'string') {
            try {
                const parsed = JSON.parse(tags);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    /**
     * Get single token model by ID
     */
    async getTokenModel(modelId) {
        const { data, error } = await this.supabase
            .from('token_models')
            .select('*')
            .eq('id', modelId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    /**
     * Create token model
     */
    async createTokenModel(model) {
        const { data, error } = await this.supabase
            .from('token_models')
            .insert({
                name: model.name,
                display_name: model.display_name,
                description: model.description,
                ai_provider: model.ai_provider,
                model_id: model.model_id,
                token_cost: model.token_cost,
                custom_system_prompt: model.custom_system_prompt,
                temperature: model.temperature,
                max_tokens: model.max_tokens,
                tags: model.tags,
                is_active: model.is_active !== false
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update token model
     */
    async updateTokenModel(modelId, updates) {
        const { data, error } = await this.supabase
            .from('token_models')
            .update(updates)
            .eq('id', modelId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete token model
     */
    async deleteTokenModel(modelId) {
        const { data, error } = await this.supabase
            .from('token_models')
            .delete()
            .eq('id', modelId);

        if (error) throw error;
        return data;
    }

    // ============================================================================
    // USER TOKENS
    // ============================================================================

    /**
     * Get user token balance
     */
    async getUserTokens(userId) {
        const { data, error } = await this.supabase
            .from('user_tokens')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User doesn't have tokens yet, create initial balance
                return await this.initializeUserTokens(userId);
            }
            throw error;
        }
        return data;
    }

    /**
     * Initialize user tokens (first time)
     */
    async initializeUserTokens(userId, initialBalance = 100) {
        const { data, error } = await this.supabase
            .from('user_tokens')
            .insert({
                user_id: userId,
                balance: initialBalance,
                lifetime_earned: initialBalance
            })
            .select()
            .single();

        if (error) throw error;

        // Log initial grant transaction
        await this.logTransaction(userId, initialBalance, 'admin_grant', 'Initial token grant', initialBalance);

        return data;
    }

    /**
     * Get all user balances (admin only)
     */
    async getAllUserBalances() {
        const { data, error } = await this.supabase
            .from('user_tokens')
            .select('*')
            .order('balance', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Deduct tokens from user
     */
    async deductTokens(userId, amount, reference = null, modelId = null, apiCost = null, providerCostPer500 = null) {
        try {
            // Get current balance
            const { data: currentTokens, error: fetchError } = await this.supabase
                .from('user_tokens')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (fetchError) throw fetchError;

            const currentBalance = currentTokens?.balance || 0;
            
            if (currentBalance < amount) {
                throw new Error('Insufficient token balance');
            }

            const newBalance = currentBalance - amount;

            // Update balance
            const { error: updateError } = await this.supabase
                .from('user_tokens')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // Log transaction (negative amount for deduction) with analytics data
            await this.logTransaction(userId, -amount, 'usage', reference, newBalance, modelId, apiCost, providerCostPer500);

            return {
                success: true,
                new_balance: newBalance
            };
        } catch (error) {
            console.error('[SupabaseAdminTokenService] Error deducting tokens:', error);
            throw error;
        }
    }

    /**
     * Grant tokens to user
     */
    async grantTokens(userId, amount, type = 'admin_grant', reference = null) {
        try {
            // Get current balance
            const { data: currentTokens, error: fetchError } = await this.supabase
                .from('user_tokens')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            const currentBalance = currentTokens?.balance || 0;
            const newBalance = currentBalance + amount;

            // Update or insert balance
            const { error: upsertError } = await this.supabase
                .from('user_tokens')
                .upsert({
                    user_id: userId,
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (upsertError) throw upsertError;

            // Log transaction
            await this.logTransaction(userId, amount, type, reference, newBalance);

            return {
                success: true,
                new_balance: newBalance
            };
        } catch (error) {
            console.error('[SupabaseAdminTokenService] Error granting tokens:', error);
            throw error;
        }
    }

    /**
     * Get all user token balances (admin only)
     */
    async getAllUserTokens() {
        const { data, error } = await this.supabase
            .from('user_tokens')
            .select('*')
            .order('balance', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // ============================================================================
    // TOKEN TRANSACTIONS
    // ============================================================================

    /**
     * Log a token transaction
     */
    async logTransaction(userId, amount, type, reference, balanceAfter, modelId = null, apiCost = null, providerCostPer500 = null) {

        const { data, error } = await this.supabase
            .from('token_transactions')
            .insert({
                user_id: userId,
                amount: amount,
                type: type,
                reference: reference,
                balance_after: balanceAfter,
                model_id: modelId,
                api_cost_usd: apiCost,
                provider_cost_per_500_tokens: providerCostPer500
            })
            .select()
            .single();

        if (error) {
            console.error('[SupabaseAdminTokenService] Error logging transaction:', error);
            throw error;
        }

        return data;
    }

    /**
     * Refund credits to user
     */
    async refundCredits(userId, amount, reason) {
        const currentBalance = await this.getUserTokens(userId);
        const newBalance = currentBalance.balance + amount;

        const { data, error } = await this.supabase
            .from('user_tokens')
            .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) throw error;

        // Log refund transaction
        await this.logTransaction(userId, amount, 'refund', reason, newBalance);

        return { balance: newBalance, refunded: amount };
    }

    /**
     * Log a failed transaction for admin review
     */
    async logFailedTransaction(userId, modelId, errorMessage, refundedCredits) {
        const { data, error } = await this.supabase
            .from('failed_transactions')
            .insert({
                user_id: userId,
                model_id: modelId,
                error_message: errorMessage,
                refunded_credits: refundedCredits
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get failed transactions for admin review
     */
    async getFailedTransactions(reviewedOnly = false) {
        let query = this.supabase
            .from('failed_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (reviewedOnly !== null) {
            query = query.eq('reviewed', reviewedOnly);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    /**
     * Mark failed transaction as reviewed
     */
    async markFailedTransactionReviewed(transactionId) {
        const { data, error } = await this.supabase
            .from('failed_transactions')
            .update({ reviewed: true })
            .eq('id', transactionId);

        if (error) throw error;
        return data;
    }

    /**
     * Get user's token transaction history
     */
    async getUserTransactions(userId, limit = 50) {
        const { data, error } = await this.supabase
            .from('token_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get all transactions (admin only)
     */
    async getAllTransactions(limit = 100) {
        const { data, error } = await this.supabase
            .from('token_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStats() {
        const { data, error } = await this.supabase
            .from('token_transactions')
            .select('type, amount');

        if (error) throw error;

        // Calculate stats
        const stats = {
            total_usage: 0,
            total_granted: 0,
            total_purchased: 0,
            total_refills: 0,
            transaction_count: data.length
        };

        data.forEach(tx => {
            if (tx.type === 'usage') {
                stats.total_usage += Math.abs(tx.amount);
            } else if (tx.type === 'admin_grant') {
                stats.total_granted += tx.amount;
            } else if (tx.type === 'purchase') {
                stats.total_purchased += tx.amount;
            } else if (tx.type === 'weekly_refill') {
                stats.total_refills += tx.amount;
            }
        });

        return stats;
    }
}

// Export singleton instance
module.exports = new SupabaseAdminTokenService();
