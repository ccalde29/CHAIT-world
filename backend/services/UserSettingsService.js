// backend/services/UserSettingsService.js
// Handles user settings and persona operations

class UserSettingsService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // ============================================================================
    // USER SETTINGS MANAGEMENT
    // ============================================================================

    async getUserSettings(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) {
                // Return defaults if no settings (in camelCase for frontend)
                return {
                    userId: userId,
                    apiKeys: {},
                    ollamaSettings: { baseUrl: 'http://localhost:11434' },
                    groupDynamicsMode: 'natural',
                    messageDelay: 1200
                };
            }

            // Return data in camelCase for frontend
            return {
                userId: data.user_id,
                apiKeys: data.api_keys || {},
                ollamaSettings: data.ollama_settings || { baseUrl:'http://localhost:11434' },
                groupDynamicsMode: data.group_dynamics_mode || 'natural',
                messageDelay: data.message_delay || 1200,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

        } catch (error) {
            console.error('Database error getting user settings:', error);
            throw error;
        }
    }

    async updateUserSettings(userId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    api_keys: updates.api_keys || updates.apiKeys,
                    ollama_settings: updates.ollama_settings ||updates.ollamaSettings,
                    group_dynamics_mode: updates.group_dynamics_mode ||updates.groupDynamicsMode,
                    message_delay: updates.message_delay || updates.messageDelay,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            // Return in camelCase for frontend
            return {
                userId: data.user_id,
                apiKeys: data.api_keys || {},
                ollamaSettings: data.ollama_settings || { baseUrl:'http://localhost:11434' },
                groupDynamicsMode: data.group_dynamics_mode || 'natural',
                messageDelay: data.message_delay || 1200,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

        } catch (error) {
            console.error('Database error updating user settings:', error);
            throw error;
        }
    }

    // ============================================================================
    // USER PERSONA MANAGEMENT
    // ============================================================================

    async getUserPersona(userId) {
        try {
            // First, check if there's an active_persona_id in user_settings
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('active_persona_id')
                .eq('user_id', userId)
                .single();

            let personaData = null;

            // If active_persona_id is set, fetch that persona
            if (settings?.active_persona_id) {
                const { data } = await this.supabase
                    .from('user_personas')
                    .select('*')
                    .eq('id', settings.active_persona_id)
                    .eq('user_id', userId)
                    .single();

                personaData = data;
            }

            // Fallback: Get first is_active persona if no active_persona_id
            if (!personaData) {
                const { data } = await this.supabase
                    .from('user_personas')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single();

                personaData = data;
            }

            if (!personaData) {
                return {
                    hasPersona: false,
                    persona: {
                        name: 'User',
                        personality: 'A curious individual engaging in conversation',
                        interests: [],
                        communication_style: 'casual and friendly',
                        avatar: '=d',
                        color: 'from-blue-500 to-indigo-500'
                    }
                };
            }

            return {
                hasPersona: true,
                persona: {
                    id: personaData.id,
                    name: personaData.name,
                    personality: personaData.personality,
                    interests: personaData.interests || [],
                    communication_style: personaData.communication_style || '',
                    avatar: personaData.avatar,
                    color: personaData.color,
                    avatar_image_url: personaData.avatar_image_url,
                    avatar_image_filename: personaData.avatar_image_filename,
                    uses_custom_image: personaData.uses_custom_image,
                    created_at: personaData.created_at
                }
            };

        } catch (error) {
            console.error('Database error getting user persona:', error);
            throw error;
        }
    }

    async createOrUpdateUserPersona(userId, personaData) {
        try {
            // Check if user already has an active persona
            const { data: existingPersona } = await this.supabase
                .from('user_personas')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            if (existingPersona) {
                // Update existing persona
                const { data, error } = await this.supabase
                    .from('user_personas')
                    .update({
                        name: personaData.name,
                        personality: personaData.personality,
                        interests: personaData.interests,
                        communication_style: personaData.communication_style,
                        avatar: personaData.avatar,
                        color: personaData.color,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingPersona.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Create new persona
                const { data, error } = await this.supabase
                    .from('user_personas')
                    .insert({
                        user_id: userId,
                        name: personaData.name,
                        personality: personaData.personality,
                        interests: personaData.interests,
                        communication_style: personaData.communication_style,
                        avatar: personaData.avatar,
                        color: personaData.color,
                        is_active: true
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

        } catch (error) {
            console.error('Database error creating/updating user persona:', error);
            throw error;
        }
    }

    async deleteUserPersona(userId) {
        try {
            const { error } = await this.supabase
                .from('user_personas')
                .update({ is_active: false })
                .eq('user_id', userId);

            if (error) throw error;
            return { message: 'User persona deleted successfully' };

        } catch (error) {
            console.error('Database error deleting user persona:', error);
            throw error;
        }
    }
}

module.exports = UserSettingsService;
