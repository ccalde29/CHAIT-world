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

}


// Export singleton instance
module.exports = new SupabaseAdminTokenService();
