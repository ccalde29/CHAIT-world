// backend/services/database.js
// Main database service that composes all specialized services
// Routes operations between Supabase (web/community) and SQLite (local/desktop/mobile)

const { createClient } = require('@supabase/supabase-js');
const { getInstance: getLocalDb } = require('./LocalDatabaseService');
const ChatService = require('./ChatService');
const UserSettingsService = require('./UserSettingsService');
const ScenarioService = require('./ScenarioService');
const MemoryService = require('./MemoryService');
const ImageService = require('./ImageService');

class DatabaseService {
    constructor(options = {}) {
        // Determine deployment mode: 'web' or 'local'
        // - 'web': Use Supabase for everything (traditional web app)
        // - 'local': Use SQLite for local data, Supabase only for community features
        this.mode = options.mode || process.env.DEPLOYMENT_MODE || 'web';
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Initialize Supabase (always needed for community features)
        if (supabaseUrl && supabaseServiceKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseServiceKey);
                this.supabaseAvailable = true;
                console.log(`[Database] Supabase initialized for ${this.mode} mode`);
            } catch (error) {
                console.error('[Database] Failed to initialize Supabase:', error);
                this.supabaseAvailable = false;
                if (this.mode === 'web') {
                    throw new Error('Failed to initialize Supabase for web mode');
                }
            }
        } else {
            this.supabaseAvailable = false;
            if (this.mode === 'web') {
                throw new Error('Missing Supabase environment variables for web mode');
            }
            console.warn('[Database] Supabase not configured - running in offline-only mode');
        }

        // Initialize local database for local mode
        if (this.mode === 'local') {
            try {
                this.localDb = getLocalDb(options.localDbPath);
                this.localDb.initialize();
                console.log('[Database] SQLite initialized for local mode');
            } catch (error) {
                console.error('[Database] Failed to initialize SQLite:', error);
                throw error; // Local mode requires SQLite
            }
        }

        // Initialize Supabase-based services (for web mode or community operations)
        if (this.supabaseAvailable) {
            this.chatService = new ChatService(this.supabase);
            this.userSettingsService = new UserSettingsService(this.supabase);
            this.scenarioService = new ScenarioService(this.supabase);
            this.memoryService = new MemoryService(this.supabase);
            this.imageService = new ImageService(this.supabase);
        }
    }

    /**
     * Check if we're in local mode
     */
    isLocalMode() {
        return this.mode === 'local';
    }

    /**
     * Check if we're in web mode
     */
    isWebMode() {
        return this.mode === 'web';
    }

    /**
     * Check if Supabase is available (for community features)
     */
    isCommunityAvailable() {
        return this.supabaseAvailable;
    }

    // ============================================================================
    // CHAT SESSION & MESSAGE MANAGEMENT
    // Local mode: SQLite | Web mode: Supabase
    // ============================================================================

    async createChatSession(userId, sessionData) {
        if (this.isLocalMode()) {
            return this.localDb.createChatSession(userId, sessionData);
        }
        return this.chatService.createChatSession(userId, sessionData);
    }

    async saveChatMessage(sessionId, messageData) {
        if (this.isLocalMode()) {
            return this.localDb.createMessage(messageData);
        }
        return this.chatService.saveChatMessage(sessionId, messageData);
    }

    async getChatSession(userId, sessionId) {
        if (this.isLocalMode()) {
            return this.localDb.getChatSession(sessionId);
        }
        return this.chatService.getChatSession(userId, sessionId);
    }

    async getChatHistory(userId, limit = 20) {
        if (this.isLocalMode()) {
            return this.localDb.getChatSessionsByUser(userId, limit);
        }
        return this.chatService.getChatHistory(userId, limit);
    }

    async updateChatSessionActivity(sessionId) {
        if (this.isLocalMode()) {
            return this.localDb.updateChatSession(sessionId, { 
                last_activity: new Date().toISOString() 
            });
        }
        return this.chatService.updateChatSessionActivity(sessionId);
    }

    async updateChatSession(userId, sessionId, updates) {
        if (this.isLocalMode()) {
            return this.localDb.updateChatSession(sessionId, updates);
        }
        return this.chatService.updateChatSession(userId, sessionId, updates);
    }

    async deleteChatSession(userId, sessionId) {
        if (this.isLocalMode()) {
            return this.localDb.deleteChatSession(sessionId);
        }
        return this.chatService.deleteChatSession(userId, sessionId);
    }

    async getChatMessages(sessionId, limit = 100) {
        if (this.isLocalMode()) {
            return this.localDb.getMessagesBySession(sessionId, limit);
        }
        // For web mode, use existing chat service method
        return this.chatService.getChatMessages(sessionId, limit);
    }

    // ============================================================================
    // CHARACTER MANAGEMENT
    // Local mode: SQLite | Web mode: Supabase
    // Note: Character CRUD is local, but publish/import are community operations
    // ============================================================================

    async createCharacter(userId, characterData) {
        if (this.isLocalMode()) {
            return this.localDb.createCharacter(userId, characterData);
        }
        // For web mode, use existing character service
        throw new Error('Character creation in web mode needs CharacterService');
    }

    async getCharacter(characterId) {
        if (this.isLocalMode()) {
            return this.localDb.getCharacter(characterId);
        }
        // For web mode, use existing character service
        throw new Error('Character retrieval in web mode needs CharacterService');
    }

    async getCharacters(userId) {
        if (this.isLocalMode()) {
            return this.localDb.getCharactersByUser(userId);
        }
        // For web mode, use existing character service
        throw new Error('Characters retrieval in web mode needs CharacterService');
    }

    async updateCharacter(characterId, updates) {
        if (this.isLocalMode()) {
            return this.localDb.updateCharacter(characterId, updates);
        }
        // For web mode, use existing character service
        throw new Error('Character update in web mode needs CharacterService');
    }

    async deleteCharacter(characterId) {
        if (this.isLocalMode()) {
            return this.localDb.deleteCharacter(characterId);
        }
        // For web mode, use existing character service
        throw new Error('Character deletion in web mode needs CharacterService');
    }

    async hideDefaultCharacter(userId, characterId) {
        if (this.isLocalMode()) {
            // Store in local SQLite hidden_default_characters table
            this.localDb.run(
                'INSERT OR REPLACE INTO hidden_default_characters (user_id, character_id) VALUES (?, ?)',
                [userId, characterId]
            );
            return true;
        }

        // Web mode: use Supabase
        try {
            const { error } = await this.supabase
            .from('hidden_default_characters')
            .upsert({
                user_id: userId,
                character_id: characterId
            });

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('Database error hiding character:', error);
            throw error;
        }
    }

    // ============================================================================
    // USER SETTINGS MANAGEMENT
    // Local mode: SQLite for API keys/preferences, Supabase for auth/admin
    // Web mode: Supabase only
    // ============================================================================

    async getUserSettings(userId) {
        if (this.isLocalMode()) {
            // Get local settings from SQLite
            const localSettings = this.localDb.get(
                'SELECT * FROM user_settings_local WHERE user_id = ?',
                [userId]
            );

            if (localSettings) {
                // Return in frontend-expected format (camelCase)
                return {
                    userId: localSettings.user_id,
                    apiKeys: this.localDb.safeJsonParse(localSettings.api_keys, {}),
                    ollamaSettings: this.localDb.safeJsonParse(localSettings.ollama_settings, { baseUrl: 'http://localhost:11434' }),
                    lmStudioSettings: this.localDb.safeJsonParse(localSettings.lmstudio_settings, { baseUrl: 'http://localhost:1234' }),
                    groupDynamicsMode: localSettings.group_dynamics_mode || 'natural',
                    messageDelay: localSettings.message_delay || 1200,
                    defaultProvider: localSettings.default_provider || 'openai',
                    defaultModel: localSettings.default_model,
                    activePersonaId: localSettings.active_persona_id,
                    isAdmin: false, // Local mode doesn't have admin
                    autoApproveCharacters: false,
                    adminSystemPrompt: null
                };
            }

            // Return defaults if no settings exist
            return {
                userId: userId,
                apiKeys: {},
                ollamaSettings: { baseUrl: 'http://localhost:11434' },
                lmStudioSettings: { baseUrl: 'http://localhost:1234' },
                groupDynamicsMode: 'natural',
                messageDelay: 1200,
                defaultProvider: 'openai',
                defaultModel: null,
                isAdmin: false,
                autoApproveCharacters: false,
                adminSystemPrompt: null
            };
        }
        return this.userSettingsService.getUserSettings(userId);
    }

    async updateUserSettings(userId, updates) {
        if (this.isLocalMode()) {
            // Normalize keys (handle both camelCase from frontend and snake_case from DB)
            const normalized = {
                api_keys: updates.apiKeys || updates.api_keys || {},
                ollama_settings: updates.ollamaSettings || updates.ollama_settings || { baseUrl: 'http://localhost:11434' },
                lmstudio_settings: updates.lmStudioSettings || updates.lmstudio_settings || { baseUrl: 'http://localhost:1234' },
                preferences: updates.preferences || {},
                default_provider: updates.defaultProvider || updates.default_provider || 'openai',
                default_model: updates.defaultModel || updates.default_model || null,
                group_dynamics_mode: updates.groupDynamicsMode || updates.group_dynamics_mode || 'natural',
                message_delay: updates.messageDelay || updates.message_delay || 1200,
                auto_approve_characters: updates.autoApproveCharacters || updates.auto_approve_characters || false,
                admin_system_prompt: updates.adminSystemPrompt || updates.admin_system_prompt || null
            };

            // Check if settings exist
            const existing = this.localDb.get(
                'SELECT id FROM user_settings_local WHERE user_id = ?',
                [userId]
            );

            if (existing) {
                // Update existing settings
                this.localDb.run(
                    `UPDATE user_settings_local 
                     SET api_keys = ?, 
                         ollama_settings = ?, 
                         lmstudio_settings = ?,
                         preferences = ?,
                         default_provider = ?,
                         default_model = ?
                     WHERE user_id = ?`,
                    [
                        JSON.stringify(normalized.api_keys),
                        JSON.stringify(normalized.ollama_settings),
                        JSON.stringify(normalized.lmstudio_settings),
                        JSON.stringify(normalized.preferences),
                        normalized.default_provider,
                        normalized.default_model,
                        userId
                    ]
                );
            } else {
                // Insert new settings
                this.localDb.run(
                    `INSERT INTO user_settings_local (user_id, api_keys, ollama_settings, lmstudio_settings, preferences, default_provider, default_model)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        JSON.stringify(normalized.api_keys),
                        JSON.stringify(normalized.ollama_settings),
                        JSON.stringify(normalized.lmstudio_settings),
                        JSON.stringify(normalized.preferences),
                        normalized.default_provider,
                        normalized.default_model
                    ]
                );
            }

            return this.getUserSettings(userId);
        }
        return this.userSettingsService.updateUserSettings(userId, updates);
    }

    // ============================================================================
    // USER PERSONA MANAGEMENT
    // Local mode: SQLite | Web mode: Supabase
    // ============================================================================

    async getUserPersona(userId) {
        if (this.isLocalMode()) {
            const personas = this.localDb.all(
                'SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            return { personas: personas || [] };
        }
        return this.userSettingsService.getUserPersona(userId);
    }

    async createOrUpdateUserPersona(userId, personaData) {
        if (this.isLocalMode()) {
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
        return this.userSettingsService.createOrUpdateUserPersona(userId, personaData);
    }

    async deleteUserPersona(userId) {
        if (this.isLocalMode()) {
            this.localDb.run('DELETE FROM user_personas WHERE user_id = ?', [userId]);
            return { success: true };
        }
        return this.userSettingsService.deleteUserPersona(userId);
    }

    // ============================================================================
    // SCENARIO MANAGEMENT
    // Local mode: SQLite | Web mode: Supabase
    // ============================================================================

    async getScenarios(userId) {
        if (this.isLocalMode()) {
            return this.localDb.getScenariosByUser(userId);
        }
        return this.scenarioService.getScenarios(userId);
    }

    async createScenario(userId, scenarioData) {
        if (this.isLocalMode()) {
            return this.localDb.createScenario(userId, scenarioData);
        }
        return this.scenarioService.createScenario(userId, scenarioData);
    }

    async updateScenario(userId, scenarioId, updates) {
        if (this.isLocalMode()) {
            return this.localDb.updateScenario(scenarioId, updates);
        }
        return this.scenarioService.updateScenario(userId, scenarioId, updates);
    }

    async deleteScenario(userId, scenarioId) {
        if (this.isLocalMode()) {
            return this.localDb.deleteScenario(scenarioId);
        }
        return this.scenarioService.deleteScenario(userId, scenarioId);
    }

    // ============================================================================
    // CHARACTER MEMORY MANAGEMENT
    // Local mode: SQLite | Web mode: Supabase
    // TODO: Implement full memory operations in LocalDatabaseService
    // ============================================================================

    async getCharacterMemories(characterId, userId, limit = 10) {
        if (this.isLocalMode()) {
            const memories = this.localDb.all(
                'SELECT * FROM character_memories WHERE character_id = ? AND user_id = ? ORDER BY importance_score DESC, last_accessed DESC LIMIT ?',
                [characterId, userId, limit]
            );
            return memories.map(mem => ({
                ...mem,
                tags: this.localDb.safeJsonParse(mem.tags, [])
            }));
        }
        return this.memoryService.getCharacterMemories(characterId, userId, limit);
    }

    async addCharacterMemory(characterId, userId, memoryData) {
        if (this.isLocalMode()) {
            const result = this.localDb.run(
                `INSERT INTO character_memories (
                    character_id, user_id, memory_type, content, importance_score,
                    emotional_valence, related_session_id, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    characterId,
                    userId,
                    memoryData.memory_type || 'episodic',
                    memoryData.content,
                    memoryData.importance_score || 0.5,
                    memoryData.emotional_valence || 0.0,
                    memoryData.related_session_id || null,
                    JSON.stringify(memoryData.tags || [])
                ]
            );
            return { id: result.lastInsertRowid, ...memoryData };
        }
        return this.memoryService.addCharacterMemory(characterId, userId, memoryData);
    }

    async clearCharacterMemories(characterId, userId) {
        if (this.isLocalMode()) {
            this.localDb.run(
                'DELETE FROM character_memories WHERE character_id = ? AND user_id = ?',
                [characterId, userId]
            );
            return { success: true };
        }
        return this.memoryService.clearCharacterMemories(characterId, userId);
    }

    async getCharacterRelationship(characterId, userId) {
        if (this.isLocalMode()) {
            const relationship = this.localDb.get(
                'SELECT * FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_type = ?',
                [characterId, userId, 'user']
            );
            return relationship || null;
        }
        return this.memoryService.getCharacterRelationship(characterId, userId);
    }

    async updateCharacterRelationship(characterId, userId, relationshipData) {
        if (this.isLocalMode()) {
            const existing = this.localDb.get(
                'SELECT id FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_type = ?',
                [characterId, userId, 'user']
            );

            if (existing) {
                // Update existing relationship
                const setClauses = [];
                const values = [];

                for (const [key, value] of Object.entries(relationshipData)) {
                    if (['relationship_type', 'trust_level', 'familiarity_level', 'emotional_bond', 'custom_context'].includes(key)) {
                        setClauses.push(`${key} = ?`);
                        values.push(value);
                    }
                }

                if (setClauses.length > 0) {
                    setClauses.push('interaction_count = interaction_count + 1');
                    setClauses.push('last_interaction = CURRENT_TIMESTAMP');
                    values.push(existing.id);
                    this.localDb.run(
                        `UPDATE character_relationships SET ${setClauses.join(', ')} WHERE id = ?`,
                        values
                    );
                }
            } else {
                // Create new relationship
                this.localDb.run(
                    `INSERT INTO character_relationships (
                        character_id, user_id, target_type, relationship_type,
                        trust_level, familiarity_level, emotional_bond, custom_context
                    ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?)`,
                    [
                        characterId,
                        userId,
                        relationshipData.relationship_type || 'neutral',
                        relationshipData.trust_level || 0.5,
                        relationshipData.familiarity_level || 0.1,
                        relationshipData.emotional_bond || 0.0,
                        relationshipData.custom_context || null
                    ]
                );
            }

            return this.getCharacterRelationship(characterId, userId);
        }
        return this.memoryService.updateCharacterRelationship(characterId, userId, relationshipData);
    }

    async buildCharacterContext(characterId, userId, sessionId = null, otherCharacters = []) {
        if (this.isLocalMode()) {
            // Build context from local database
            const memories = await this.getCharacterMemories(characterId, userId, 10);
            const relationship = await this.getCharacterRelationship(characterId, userId);
            const personaResult = await this.getUserPersona(userId);
            
            return {
                memories,
                relationship,
                userPersona: personaResult.personas?.[0] || null,
                sessionState: null // TODO: Implement session state retrieval
            };
        }

        // Get user persona first
        const userPersonaResult = await this.userSettingsService.getUserPersona(userId);

        // Build character context from memory service
        const context = await this.memoryService.buildCharacterContext(
            characterId,
            userId,
            sessionId,
            otherCharacters
        );

        // Add user persona to context
        return {
            ...context,
            userPersona: userPersonaResult.persona
        };
    }

    analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId) {
        // This is a utility method that doesn't directly access the database
        // Can be used in both modes
        if (this.isWebMode()) {
            return this.memoryService.analyzeConversationForMemories(
                userMessage,
                characterResponse,
                userPersona,
                userId
            );
        }
        // For local mode, return basic memory analysis
        return {
            shouldCreateMemory: true,
            memoryType: 'episodic',
            importanceScore: 0.5,
            emotionalValence: 0.0
        };
    }

    calculateRelationshipUpdate(currentRelationship, userMessage, characterResponse) {
        // Utility method for both modes
        if (this.isWebMode()) {
            return this.memoryService.calculateRelationshipUpdate(
                currentRelationship,
                userMessage,
                characterResponse
            );
        }
        // Basic relationship update for local mode
        return {
            trust_level: (currentRelationship?.trust_level || 0.5) + 0.01,
            familiarity_level: (currentRelationship?.familiarity_level || 0.1) + 0.02,
            emotional_bond: currentRelationship?.emotional_bond || 0.0
        };
    }

    determineRelationshipType(emotionalBond, familiarityLevel) {
        // Utility method for both modes
        if (this.isWebMode()) {
            return this.memoryService.determineRelationshipType(emotionalBond, familiarityLevel);
        }
        // Simple determination for local mode
        if (familiarityLevel < 0.3) return 'stranger';
        if (familiarityLevel < 0.6) return 'acquaintance';
        if (emotionalBond > 0.5) return 'friend';
        return 'neutral';
    }

    // ============================================================================
    // IMAGE MANAGEMENT
    // Local mode: File system | Web mode: Supabase Storage
    // TODO: Implement local file storage for images
    // ============================================================================

    async updateCharacterImage(userId, characterId, imageData) {
        if (this.isLocalMode()) {
            // For local mode, images are stored in file system
            // Store metadata in SQLite user_images table
            const result = this.localDb.run(
                'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
                [userId, imageData.filename, imageData.url, 'avatar', characterId]
            );
            return { id: result.lastInsertRowid, ...imageData };
        }
        return this.imageService.updateCharacterImage(userId, characterId, imageData);
    }

    async updateUserPersonaImage(userId, imageData) {
        if (this.isLocalMode()) {
            const result = this.localDb.run(
                'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
                [userId, imageData.filename, imageData.url, 'avatar', userId]
            );
            return { id: result.lastInsertRowid, ...imageData };
        }
        return this.imageService.updateUserPersonaImage(userId, imageData);
    }

    async updateScenarioImage(userId, scenarioId, imageData) {
        if (this.isLocalMode()) {
            const result = this.localDb.run(
                'INSERT INTO user_images (user_id, filename, url, image_type, associated_id) VALUES (?, ?, ?, ?, ?)',
                [userId, imageData.filename, imageData.url, 'background', scenarioId]
            );
            return { id: result.lastInsertRowid, ...imageData };
        }
        return this.imageService.updateScenarioImage(userId, scenarioId, imageData);
    }

    async deleteImage(userId, filename, type) {
        if (this.isLocalMode()) {
            this.localDb.run(
                'DELETE FROM user_images WHERE user_id = ? AND filename = ? AND image_type = ?',
                [userId, filename, type]
            );
            return { success: true };
        }
        return this.imageService.deleteImage(userId, filename, type);
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

            // Get the character from the appropriate database
            let character;
            if (this.isLocalMode()) {
                character = this.localDb.getCharacter(characterId);
            } else {
                // Web mode: get from Supabase
                const { data, error } = await this.supabase
                    .from('characters')
                    .select('*')
                    .eq('id', characterId)
                    .eq('user_id', userId)
                    .single();
                
                if (error) throw error;
                character = data;
            }

            if (!character) {
                throw new Error('Character not found');
            }

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
                moderation_status: 'approved' // Auto-approve for now
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
                const { data, error } = await this.supabase
                    .from('community_characters')
                    .insert(communityData)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }

            // Mark as published in local database
            if (this.isLocalMode()) {
                // For local mode, we could add a flag, but it's not critical
                // The source of truth for publication is in Supabase
            } else {
                // Web mode: update character's is_public flag
                await this.supabase
                    .from('characters')
                    .update({ is_public: true })
                    .eq('id', characterId);
            }

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
            // Get character from community
            const { data: communityChar, error } = await this.supabase
                .from('community_characters')
                .select('*')
                .eq('id', communityCharacterId)
                .single();

            if (error) throw error;

            // Import to local database (if in local mode)
            if (this.isLocalMode()) {
                const characterData = {
                    name: communityChar.name,
                    personality: communityChar.personality,
                    age: communityChar.age,
                    sex: communityChar.sex,
                    appearance: communityChar.appearance,
                    background: communityChar.background,
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
                    uses_custom_image: communityChar.uses_custom_image
                };

                return this.localDb.createCharacter(userId, characterData);
            }

            // For web mode, create in Supabase characters table
            return communityChar;
        } catch (error) {
            console.error('Error importing character:', error);
            // Check if it's a network error
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('fetch failed')) {
                const offlineError = new Error('Unable to import character - no internet connection');
                offlineError.code = 'OFFLINE';
                offlineError.offline = true;
                throw offlineError;
            }
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        if (this.isLocalMode()) {
            return this.localDb.getStats();
        }
        return {
            mode: 'web',
            message: 'Stats not available in web mode'
        };
    }
}

module.exports = DatabaseService;
