// backend/services/ScenarioService.js
// Handles scenario management operations

class ScenarioService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get all scenarios (default + custom) for a user
     */
    async getScenarios(userId) {
        try {
            const { data: customScenarios, error } = await this.supabase
                .from('scenarios')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const defaultScenarios = [
                {
                    id: 'coffee-shop',
                    name: 'Coffee Shop Hangout',
                    description: 'Casual afternoon at a cozy coffee shop',
                    initial_message: 'The group is hanging out at a cozy coffee shop on a relaxed afternoon, sharing drinks and casual conversation.',
                    atmosphere: 'relaxed and friendly',
                    is_default: true
                },
                {
                    id: 'study-group',
                    name: 'Study Session',
                    description: 'Working on assignments together',
                    initial_message: 'The group is in a study session, working on assignments together but taking breaks to chat and help each other.',
                    atmosphere: 'focused but collaborative',
                    is_default: true
                },
                {
                    id: 'party',
                    name: 'House Party',
                    description: 'Weekend party with music and games',
                    initial_message: 'The group is at a weekend house party with music playing, people socializing, and a fun, energetic atmosphere.',
                    atmosphere: 'energetic and social',
                    is_default: true
                }
            ];

            const allScenarios = [...defaultScenarios, ...(customScenarios || [])];

            return {
                scenarios: allScenarios,
                total: allScenarios.length
            };

        } catch (error) {
            console.error('Database error getting scenarios:', error);
            throw error;
        }
    }

    /**
     * Create a new scenario
     */
    async createScenario(userId, scenarioData) {
        try {
            const { data, error } = await this.supabase
                .from('scenarios')
                .insert({
                    user_id: userId,
                    name: scenarioData.name,
                    description: scenarioData.description,
                    initial_message: scenarioData.initial_message,
                    atmosphere: scenarioData.atmosphere || 'neutral',
                    background_image_url: scenarioData.background_image_url || null,
                    background_image_filename: scenarioData.background_image_filename || null,
                    uses_custom_background: scenarioData.uses_custom_background || false
                })
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Database error creating scenario:', error);
            throw error;
        }
    }

    /**
     * Update an existing scenario
     */
    async updateScenario(userId, scenarioId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('scenarios')
                .update({
                    name: updates.name,
                    description: updates.description,
                    initial_message: updates.initial_message,
                    atmosphere: updates.atmosphere,
                    background_image_url: updates.background_image_url || null,
                    background_image_filename: updates.background_image_filename || null,
                    uses_custom_background: updates.uses_custom_background || false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', scenarioId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Database error updating scenario:', error);
            throw error;
        }
    }

    /**
     * Delete a scenario
     */
    async deleteScenario(userId, scenarioId) {
        try {
            const { error } = await this.supabase
                .from('scenarios')
                .delete()
                .eq('id', scenarioId)
                .eq('user_id', userId);

            if (error) throw error;
            return { message: 'Scenario deleted', scenarioId };

        } catch (error) {
            console.error('Database error deleting scenario:', error);
            throw error;
        }
    }
}

module.exports = ScenarioService;
