// backend/services/database.js
// Main database service that composes all specialized services
// Routes operations between Supabase (web/community) and SQLite (local/desktop/mobile)

const { createClient } = require('@supabase/supabase-js');
const { getInstance: getLocalDb } = require('./LocalDatabaseService');
const MemoryService = require('./MemoryService');

class DatabaseService {
    constructor(options = {}) {
        // Always use local mode: SQLite for local data, Supabase only for community features
        this.mode = 'local';
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Initialize Supabase (always needed for community features)
        if (supabaseUrl && supabaseServiceKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseServiceKey);
                this.supabaseAvailable = true;
                
                // Load Supabase admin/token service only if env vars are set
                this.supabaseService = require('./SupabaseAdminTokenService');
                
                console.log('[Database] Supabase initialized for community features');
            } catch (error) {
                console.error('[Database] Failed to initialize Supabase:', error);
                this.supabaseAvailable = false;
            }
        } else {
            this.supabaseAvailable = false;
            console.warn('[Database] Supabase not configured - community features unavailable');
        }

        // Initialize local SQLite database
        try {
            this.localDb = getLocalDb(options.localDbPath);
            this.localDb.initialize();
            console.log('[Database] SQLite initialized for local data');
        } catch (error) {
            console.error('[Database] Failed to initialize SQLite:', error);
            throw error;
        }

        // Initialize MemoryService with this DatabaseService instance
        if (this.supabaseAvailable) {
            this.memoryService = new MemoryService(this);
        }
    }

    /**
     * Check if we're in local mode (always true now)
     */
    isLocalMode() {
        return true;
    }

    /**
     * Check if Supabase is available (for community features only)
     */
    isCommunityAvailable() {
        return this.supabaseAvailable;
    }

    // ============================================================================
    // CHAT SESSION & MESSAGE MANAGEMENT
    // Always uses local SQLite database
    // ============================================================================

    async createChatSession(userId, sessionData) {
        return this.localDb.createChatSession(userId, sessionData);
    }

    async saveChatMessage(sessionId, messageData) {
        // Ensure session_id is in messageData for local mode
        const dataWithSession = { ...messageData, session_id: sessionId };
        return this.localDb.createMessage(dataWithSession);
    }

    async getChatSession(userId, sessionId) {
        return this.localDb.getChatSession(sessionId);
    }

    async getChatHistory(userId, limit = 20) {
        return this.localDb.getChatSessionsByUser(userId, limit);
    }

    async updateChatSessionActivity(sessionId) {
        return this.localDb.updateChatSession(sessionId, { 
            last_activity: new Date().toISOString() 
        });
    }

    async updateChatSession(userId, sessionId, updates) {
        return this.localDb.updateChatSession(sessionId, updates);
    }

    async deleteChatSession(userId, sessionId) {
        return this.localDb.deleteChatSession(sessionId);
    }

    async getChatMessages(sessionId, limit = 100) {
        return this.localDb.getMessagesBySession(sessionId, limit);
    }

    // ============================================================================
    // CHARACTER MANAGEMENT
    // All character CRUD uses local SQLite database
    // Publish/import operations use Supabase for community features
    // ============================================================================

    async createCharacter(userId, characterData) {
        return this.localDb.createCharacter(userId, characterData);
    }

    async getCharacter(characterId) {
        return this.localDb.getCharacter(characterId);
    }

    async getCharacters(userId) {
        return this.localDb.getCharactersByUser(userId);
    }

    async updateCharacter(characterId, updates) {
        return this.localDb.updateCharacter(characterId, updates);
    }

    async deleteCharacter(characterId) {
        return this.localDb.deleteCharacter(characterId);
    }

    async hideDefaultCharacter(userId, characterId) {
        this.localDb.run(
            'INSERT OR REPLACE INTO hidden_default_characters (user_id, character_id) VALUES (?, ?)',
            [userId, characterId]
        );
        return true;
    }

    // ============================================================================
    // USER SETTINGS MANAGEMENT
    // All user settings stored in local SQLite database
    // ============================================================================

    async getUserSettings(userId) {
        const localSettings = this.localDb.getUserSettings(userId);
        
        // If user is admin and Supabase is available, fetch admin-specific settings from Supabase
        if (localSettings.isAdmin && this.supabaseAvailable && this.supabaseService) {
            try {
                const adminSettings = await this.supabaseService.getAdminSettings(userId);
                localSettings.autoApproveCharacters = adminSettings.auto_approve_characters;
                localSettings.adminSystemPrompt = adminSettings.admin_system_prompt;
            } catch (error) {
                console.error('[Database] Error fetching admin settings:', error);
                // Keep local defaults if Supabase fetch fails
                localSettings.autoApproveCharacters = false;
                localSettings.adminSystemPrompt = null;
            }
        }
        
        return localSettings;
    }

    async updateUserSettings(userId, updates) {
        // Save local settings (API keys, preferences, etc.)
        const result = this.localDb.updateUserSettings(userId, updates);
        
        // If updating admin settings and Supabase is available, save them to Supabase
        if ((updates.autoApproveCharacters !== undefined || updates.adminSystemPrompt !== undefined) 
            && this.supabaseAvailable && this.supabaseService) {
            try {
                const isAdmin = await this.supabaseService.isAdmin(userId);
                if (isAdmin) {
                    await this.supabaseService.updateAdminSettings(userId, {
                        auto_approve_characters: updates.autoApproveCharacters,
                        admin_system_prompt: updates.adminSystemPrompt
                    });
                }
            } catch (error) {
                console.error('[Database] Error updating admin settings:', error);
                // Continue even if Supabase update fails
            }
        }
        
        return result;
    }

    // ============================================================================
    // USER PERSONA MANAGEMENT
    // All personas stored in local SQLite database
    // ============================================================================

    async getUserPersona(userId) {
        const personas = this.localDb.all(
            'SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return { personas: personas || [] };
    }

    async getPersona(personaId, userId) {
        return this.localDb.get(
            'SELECT * FROM user_personas WHERE id = ? AND user_id = ?',
            [personaId, userId]
        );
    }

    async createOrUpdateUserPersona(userId, personaData) {
        if (personaData.id) {
            // Update existing persona
            this.localDb.run(
                'UPDATE user_personas SET name = ?, description = ?, avatar = ? WHERE id = ? AND user_id = ?',
                [personaData.name, personaData.description, personaData.avatar, personaData.id, userId]
            );
        } else {
            // Create new persona
            const result = this.localDb.run(
                'INSERT INTO user_personas (user_id, name, description, avatar) VALUES (?, ?, ?, ?)',
                [userId, personaData.name, personaData.description || null, personaData.avatar || null]
            );
            personaData.id = result.lastInsertRowid;
        }
        return this.getUserPersona(userId);
    }

    async deleteUserPersona(userId) {
        this.localDb.run('DELETE FROM user_personas WHERE user_id = ?', [userId]);
        return { success: true };
    }

    // ============================================================================
    // SCENARIO MANAGEMENT
    // All scenarios stored in local SQLite database
    // ============================================================================

    async getScenario(userId, scenarioId) {
        return this.localDb.getScenario(scenarioId);
    }

    async getScenarios(userId) {
        const scenarios = this.localDb.getScenariosByUser(userId);
        return { scenarios, total: scenarios.length };
    }

    async createScenario(userId, scenarioData) {
        return this.localDb.createScenario(userId, scenarioData);
    }

    async updateScenario(userId, scenarioId, updates) {
        return this.localDb.updateScenario(scenarioId, updates);
    }

    async deleteScenario(userId, scenarioId) {
        return this.localDb.deleteScenario(scenarioId);
    }

    // ============================================================================
    // IMAGE MANAGEMENT
    // Uses local file system storage
    // ============================================================================

    async saveImageMetadata(userId, imageData) {
        const result = this.localDb.run(
            'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
            [userId, imageData.filename, imageData.url, imageData.type || 'avatar', imageData.associated_id || null]
        );
        return { id: result.lastInsertRowid, ...imageData };
    }

    async updateCharacterImage(userId, characterId, imageData) {
        // Store metadata in SQLite user_images table
        const result = this.localDb.run(
            'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
            [userId, imageData.filename, imageData.url, 'avatar', characterId]
        );
        return { id: result.lastInsertRowid, ...imageData };
    }

    async updateUserPersonaImage(userId, imageData) {
        const result = this.localDb.run(
            'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
            [userId, imageData.filename, imageData.url, 'avatar', userId]
        );
        return { id: result.lastInsertRowid, ...imageData };
    }

    async updateScenarioImage(userId, scenarioId, imageData) {
        const result = this.localDb.run(
            'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
            [userId, imageData.filename, imageData.url, 'background', scenarioId]
        );
        return { id: result.lastInsertRowid, ...imageData };
    }

    async deleteImage(userId, filename, type) {
        this.localDb.run(
            'DELETE FROM user_images WHERE user_id = ? AND filename = ? AND image_type = ?',
            [userId, filename, type]
        );
        return { success: true };
    }

    // ============================================================================
    // COMMUNITY OPERATIONS (Always use Supabase)
    // These operations always go to Supabase regardless of mode
    // ============================================================================

    /**
     * Publish a local character to the community hub
     */
    async publishCharacter(userId, characterId, publishData) {
        if (!this.isCommunityAvailable()) {
            const error = new Error('Community features require internet connection');
            error.code = 'OFFLINE';
            error.offline = true;
            throw error;
        }

        try {
            // Validate userId is UUID format for Supabase
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userId)) {
                throw new Error('Publishing to community requires authenticated user with valid UUID. Please sign in to publish.');
            }

            // Get the character from local database
            const character = this.localDb.getCharacter(characterId);

            if (!character) {
                throw new Error('Character not found');
            }

            // Get user settings to check auto_approve_characters setting
            const userSettings = await this.getUserSettings(userId);
            const moderationStatus = userSettings?.autoApproveCharacters ? 'approved' : 'pending';

            console.log('[PublishCharacter] User settings:', { 
                userId, 
                autoApproveCharacters: userSettings?.autoApproveCharacters,
                moderationStatus 
            });

            // Prepare community character data
            const communityData = {
                original_character_id: characterId,
                creator_user_id: userId,
                name: character.name,
                age: character.age,
                sex: character.sex,
                personality: publishData.isLocked && publishData.hiddenFields?.includes('personality') ? null : character.personality,
                appearance: publishData.isLocked && publishData.hiddenFields?.includes('appearance') ? null : character.appearance,
                background: publishData.isLocked && publishData.hiddenFields?.includes('background') ? null : character.background,
                avatar: character.avatar,
                color: character.color,
                chat_examples: character.chat_examples,
                tags: character.tags || [],
                temperature: character.temperature,
                max_tokens: character.max_tokens,
                context_window: character.context_window,
                memory_enabled: character.memory_enabled,
                avatar_image_url: character.avatar_image_url,
                avatar_image_filename: character.avatar_image_filename,
                uses_custom_image: character.uses_custom_image,
                is_locked: publishData.isLocked || false,
                hidden_fields: publishData.hiddenFields || [],
                moderation_status: moderationStatus
            };

            // Check if already published
            const { data: existing } = await this.supabase
                .from('community_characters')
                .select('id')
                .eq('original_character_id', characterId)
                .eq('creator_user_id', userId)
                .single();

            let result;
            if (existing) {
                // Update existing
                const { data, error } = await this.supabase
                    .from('community_characters')
                    .update(communityData)
                    .eq('id', existing.id)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            } else {
                // Create new
                console.log('[PublishCharacter] Creating new community character with moderation_status:', moderationStatus);
                const { data, error } = await this.supabase
                    .from('community_characters')
                    .insert(communityData)
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('[PublishCharacter] Successfully created:', { id: data.id, name: data.name, status: data.moderation_status });
                result = data;
            }

            // Character is published in Supabase community_characters table
            // Local database remains as-is (source of truth for user's local characters)

            return result;
        } catch (error) {
            console.error('Error publishing character:', error);
            throw error;
        }
    }

    /**
     * Import a character from community to local storage
     */
    async importCharacterFromCommunity(userId, communityCharacterId) {
        if (!this.isCommunityAvailable()) {
            const error = new Error('Community features require internet connection');
            error.code = 'OFFLINE';
            error.offline = true;
            throw error;
        }

        try {
            // Get character from Supabase community
            const { data: communityChar, error } = await this.supabase
                .from('community_characters')
                .select('*')
                .eq('id', communityCharacterId)
                .single();

            if (error) throw error;

            // Import to local SQLite database with defaults for locked/hidden fields
            const characterData = {
                name: communityChar.name,
                personality: communityChar.personality || 'A mysterious character with hidden traits.',
                age: communityChar.age,
                sex: communityChar.sex,
                appearance: communityChar.appearance || 'Their appearance is a mystery.',
                background: communityChar.background || 'Their past is shrouded in mystery.',
                avatar: communityChar.avatar,
                color: communityChar.color,
                chat_examples: communityChar.chat_examples,
                tags: communityChar.tags,
                temperature: communityChar.temperature,
                max_tokens: communityChar.max_tokens,
                context_window: communityChar.context_window,
                memory_enabled: communityChar.memory_enabled,
                avatar_image_url: communityChar.avatar_image_url,
                avatar_image_filename: communityChar.avatar_image_filename,
                uses_custom_image: communityChar.uses_custom_image,
                original_id: communityChar.id // Track where it came from
            };

            return this.localDb.createCharacter(userId, characterData);
        } catch (error) {
            console.error('Error importing character:', error);
            throw error;
        }
    }

    // ============================================================================
    // RELATIONSHIP OPERATIONS
    // Always uses local SQLite database
    // ============================================================================

    async getRelationship(characterId, userId, targetType = 'user') {
        return this.localDb.getRelationship(characterId, userId, targetType);
    }

    async getRelationshipsForCharacter(characterId, userId, targetType = null) {
        const relationships = this.localDb.getRelationshipsForCharacter(characterId, userId, targetType);
        return relationships || [];
    }

    async createOrUpdateRelationship(characterId, userId, relationshipData) {
        return this.localDb.createOrUpdateRelationship(characterId, userId, relationshipData);
    }

    async deleteRelationship(characterId, userId, targetId) {
        return this.localDb.deleteRelationship(characterId, userId, targetId);
    }

    async importSceneFromCommunity(userId, communitySceneId) {
        if (!this.isCommunityAvailable()) {
            const error = new Error('Community features require internet connection');
            error.code = 'OFFLINE';
            error.offline = true;
            throw error;
        }

        try {
            // Get scene from Supabase community
            const { data: communityScene, error } = await this.supabase
                .from('community_scenes')
                .select('*')
                .eq('id', communitySceneId)
                .single();

            if (error) throw error;

            // Import to local SQLite database
            const sceneData = {
                name: communityScene.title || communityScene.name || 'Imported Scene',
                description: communityScene.description || 'An imported community scene.',
                initial_message: communityScene.system_prompt || 'Welcome to this scene!',
                atmosphere: communityScene.category || 'neutral',
                tags: communityScene.tags,
                original_id: communityScene.id // Track where it came from
            };

            return this.localDb.createScenario(userId, sceneData);
        } catch (error) {
            console.error('Error importing scene:', error);
            throw error;
        }
    }

    // ============================================================================
    // MEMORY OPERATIONS
    // All memory operations use local SQLite database
    // ============================================================================

    async getMemoriesByCharacter(characterId, userId, limit = 20) {
        return this.localDb.getMemoriesByCharacter(characterId, userId, limit);
    }

    async getCharacterMemories(characterId, userId, limit = 20) {
        return this.localDb.getMemoriesByCharacter(characterId, userId, limit);
    }

    async createMemory(characterId, userId, memoryData) {
        return this.localDb.createMemory(characterId, userId, memoryData);
    }

    async getCharacterRelationship(characterId, userId) {
        return this.localDb.getRelationship(characterId, userId, 'user');
    }

    async clearCharacterMemories(characterId, userId) {
        await this.localDb.clearMemoriesForCharacter(characterId, userId);
        // Also clear the relationship
        await this.localDb.deleteRelationship(characterId, userId, userId);
    }

    /**
     * Get database statistics
     */
    getStats() {
        return this.localDb.getStats();
    }
}

module.exports = DatabaseService;
