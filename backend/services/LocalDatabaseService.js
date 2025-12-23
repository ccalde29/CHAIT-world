// backend/services/LocalDatabaseService.js
// SQLite database service for local/offline data storage
// Handles: characters, scenarios, chat sessions, messages, memories, etc.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

class LocalDatabaseService {
    constructor(dbPath = null) {
        // Default database location in user's home directory
        this.dbPath = dbPath || this.getDefaultDbPath();
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Get default database path (./data/local.db in project folder)
     */
    getDefaultDbPath() {
        const projectRoot = path.join(__dirname, '..', '..');
        const dataDir = path.join(projectRoot, 'data');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        return path.join(dataDir, 'local.db');
    }

    /**
     * Initialize database connection and schema
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Create database connection
            this.db = new Database(this.dbPath);
            
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');
            
            // Initialize schema if needed
            this.initializeSchema();
            
            this.isInitialized = true;
            console.log(`Local SQLite database initialized at: ${this.dbPath}`);
        } catch (error) {
            console.error('Failed to initialize local database:', error);
            throw error;
        }
    }

    /**
     * Initialize database schema from schema.sql file
     */
    initializeSchema() {
        try {
            // Check if database is already initialized
            const versionCheck = this.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
            ).get();

            if (versionCheck) {
                console.log('Database schema already exists');
                return;
            }

            // Read and execute schema file
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute schema (split by semicolon and execute each statement)
            this.db.exec(schema);
            
            console.log('Database schema initialized successfully');
        } catch (error) {
            console.error('Failed to initialize schema:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isInitialized = false;
        }
    }

    /**
     * Execute a query with parameters
     */
    run(sql, params = []) {
        this.ensureInitialized();
        return this.db.prepare(sql).run(params);
    }

    /**
     * Get single row
     */
    get(sql, params = []) {
        this.ensureInitialized();
        return this.db.prepare(sql).get(params);
    }

    /**
     * Get all rows
     */
    all(sql, params = []) {
        this.ensureInitialized();
        return this.db.prepare(sql).all(params);
    }

    /**
     * Ensure database is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            this.initialize();
        }
    }

    /**
     * Begin transaction
     */
    beginTransaction() {
        this.ensureInitialized();
        return this.db.prepare('BEGIN').run();
    }

    /**
     * Commit transaction
     */
    commit() {
        this.ensureInitialized();
        return this.db.prepare('COMMIT').run();
    }

    /**
     * Rollback transaction
     */
    rollback() {
        this.ensureInitialized();
        return this.db.prepare('ROLLBACK').run();
    }

    // ============================================================================
    // CHARACTER OPERATIONS
    // ============================================================================

    createCharacter(userId, characterData) {
        this.ensureInitialized();
        
        const stmt = this.db.prepare(`
            INSERT INTO characters (
                user_id, name, personality, avatar, color, response_style,
                age, sex, appearance, background, chat_examples, relationships,
                tags, temperature, max_tokens, context_window, memory_enabled,
                ai_provider, ai_model, fallback_provider, fallback_model,
                voice_traits, speech_patterns, avatar_image_url, avatar_image_filename,
                uses_custom_image, is_default, original_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `);

        const result = stmt.run(
            userId,
            characterData.name,
            characterData.personality,
            characterData.avatar || '🤖',
            characterData.color || 'from-gray-500 to-slate-500',
            characterData.response_style || 'custom',
            characterData.age || 18,
            characterData.sex || null,
            characterData.appearance || null,
            characterData.background || null,
            JSON.stringify(characterData.chat_examples || []),
            JSON.stringify(characterData.relationships || []),
            JSON.stringify(characterData.tags || []),
            characterData.temperature || 0.7,
            characterData.max_tokens || 150,
            characterData.context_window || 8000,
            characterData.memory_enabled ? 1 : 0,
            characterData.ai_provider || 'openai',
            characterData.ai_model || 'gpt-3.5-turbo',
            characterData.fallback_provider || null,
            characterData.fallback_model || null,
            JSON.stringify(characterData.voice_traits || {}),
            JSON.stringify(characterData.speech_patterns || {}),
            characterData.avatar_image_url || null,
            characterData.avatar_image_filename || null,
            characterData.uses_custom_image ? 1 : 0,
            characterData.is_default ? 1 : 0,
            characterData.original_id || null
        );

        // Get the created character
        const character = this.get('SELECT * FROM characters WHERE rowid = ?', [result.lastInsertRowid]);
        return character ? this.parseCharacterJson(character) : null;
    }

    getCharacter(characterId) {
        this.ensureInitialized();
        const character = this.get('SELECT * FROM characters WHERE id = ?', [characterId]);
        return character ? this.parseCharacterJson(character) : null;
    }

    getCharactersByUser(userId) {
        this.ensureInitialized();
        const characters = this.all('SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return characters.map(char => this.parseCharacterJson(char));
    }

    getAllCharacters() {
        this.ensureInitialized();
        const characters = this.all('SELECT * FROM characters ORDER BY created_at DESC');
        return characters.map(char => this.parseCharacterJson(char));
    }

    updateCharacter(characterId, updates) {
        this.ensureInitialized();
        
        const allowedFields = [
            'name', 'personality', 'avatar', 'color', 'response_style',
            'age', 'sex', 'appearance', 'background', 'chat_examples', 'relationships',
            'tags', 'temperature', 'max_tokens', 'context_window', 'memory_enabled',
            'ai_provider', 'ai_model', 'fallback_provider', 'fallback_model',
            'voice_traits', 'speech_patterns', 'avatar_image_url', 'avatar_image_filename',
            'uses_custom_image'
        ];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                
                // Handle JSON fields
                if (['chat_examples', 'relationships', 'tags', 'voice_traits', 'speech_patterns'].includes(key)) {
                    values.push(JSON.stringify(value));
                } else if (['memory_enabled', 'uses_custom_image'].includes(key)) {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (setClauses.length === 0) {
            return null;
        }

        values.push(characterId);
        
        const stmt = this.db.prepare(`
            UPDATE characters 
            SET ${setClauses.join(', ')}
            WHERE id = ?
        `);

        stmt.run(values);
        return this.getCharacter(characterId);
    }

    deleteCharacter(characterId) {
        this.ensureInitialized();
        const stmt = this.db.prepare('DELETE FROM characters WHERE id = ?');
        return stmt.run(characterId);
    }

    /**
     * Parse JSON fields in character object
     */
    parseCharacterJson(character) {
        if (!character) return null;

        return {
            ...character,
            chat_examples: this.safeJsonParse(character.chat_examples, []),
            relationships: this.safeJsonParse(character.relationships, []),
            tags: this.safeJsonParse(character.tags, []),
            voice_traits: this.safeJsonParse(character.voice_traits, {}),
            speech_patterns: this.safeJsonParse(character.speech_patterns, {}),
            memory_enabled: Boolean(character.memory_enabled),
            uses_custom_image: Boolean(character.uses_custom_image),
            is_default: Boolean(character.is_default),
            is_modified_default: Boolean(character.is_modified_default)
        };
    }

    // ============================================================================
    // SCENARIO OPERATIONS
    // ============================================================================

    createScenario(userId, scenarioData) {
        this.ensureInitialized();
        
        const stmt = this.db.prepare(`
            INSERT INTO scenarios (
                user_id, name, description, initial_message, atmosphere,
                background_image_url, background_image_filename, uses_custom_background,
                narrator_enabled, narrator_ai_provider, narrator_ai_model,
                narrator_temperature, narrator_max_tokens, narrator_trigger_mode,
                narrator_interval, narrator_personality, context_rules,
                scene_state, character_modifiers, scene_cues, is_default
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `);

        const result = stmt.run(
            userId,
            scenarioData.name,
            scenarioData.description,
            scenarioData.initial_message,
            scenarioData.atmosphere || 'neutral',
            scenarioData.background_image_url || null,
            scenarioData.background_image_filename || null,
            scenarioData.uses_custom_background ? 1 : 0,
            scenarioData.narrator_enabled ? 1 : 0,
            scenarioData.narrator_ai_provider || 'openai',
            scenarioData.narrator_ai_model || null,
            scenarioData.narrator_temperature || 0.7,
            scenarioData.narrator_max_tokens || 100,
            scenarioData.narrator_trigger_mode || 'manual',
            scenarioData.narrator_interval || 5,
            scenarioData.narrator_personality || null,
            JSON.stringify(scenarioData.context_rules || {}),
            JSON.stringify(scenarioData.scene_state || {}),
            JSON.stringify(scenarioData.character_modifiers || {}),
            JSON.stringify(scenarioData.scene_cues || []),
            scenarioData.is_default ? 1 : 0
        );

        const scenario = this.get('SELECT * FROM scenarios WHERE rowid = ?', [result.lastInsertRowid]);
        return scenario ? this.parseScenarioJson(scenario) : null;
    }

    getScenario(scenarioId) {
        this.ensureInitialized();
        const scenario = this.get('SELECT * FROM scenarios WHERE id = ?', [scenarioId]);
        return scenario ? this.parseScenarioJson(scenario) : null;
    }

    getScenariosByUser(userId) {
        this.ensureInitialized();
        const scenarios = this.all('SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return scenarios.map(scen => this.parseScenarioJson(scen));
    }

    getAllScenarios() {
        this.ensureInitialized();
        const scenarios = this.all('SELECT * FROM scenarios ORDER BY created_at DESC');
        return scenarios.map(scen => this.parseScenarioJson(scen));
    }

    updateScenario(scenarioId, updates) {
        this.ensureInitialized();
        
        const allowedFields = [
            'name', 'description', 'initial_message', 'atmosphere',
            'background_image_url', 'background_image_filename', 'uses_custom_background',
            'narrator_enabled', 'narrator_ai_provider', 'narrator_ai_model',
            'narrator_temperature', 'narrator_max_tokens', 'narrator_trigger_mode',
            'narrator_interval', 'narrator_personality', 'context_rules',
            'scene_state', 'character_modifiers', 'scene_cues'
        ];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                
                // Handle JSON fields
                if (['context_rules', 'scene_state', 'character_modifiers', 'scene_cues'].includes(key)) {
                    values.push(JSON.stringify(value));
                } else if (['narrator_enabled', 'uses_custom_background'].includes(key)) {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (setClauses.length === 0) {
            return null;
        }

        values.push(scenarioId);
        
        const stmt = this.db.prepare(`
            UPDATE scenarios 
            SET ${setClauses.join(', ')}
            WHERE id = ?
        `);

        stmt.run(values);
        return this.getScenario(scenarioId);
    }

    deleteScenario(scenarioId) {
        this.ensureInitialized();
        const stmt = this.db.prepare('DELETE FROM scenarios WHERE id = ?');
        return stmt.run(scenarioId);
    }

    /**
     * Parse JSON fields in scenario object
     */
    parseScenarioJson(scenario) {
        if (!scenario) return null;

        return {
            ...scenario,
            context_rules: this.safeJsonParse(scenario.context_rules, {}),
            scene_state: this.safeJsonParse(scenario.scene_state, {}),
            character_modifiers: this.safeJsonParse(scenario.character_modifiers, {}),
            scene_cues: this.safeJsonParse(scenario.scene_cues, []),
            narrator_enabled: Boolean(scenario.narrator_enabled),
            uses_custom_background: Boolean(scenario.uses_custom_background),
            is_default: Boolean(scenario.is_default)
        };
    }

    // ============================================================================
    // CHAT SESSION OPERATIONS
    // ============================================================================

    createChatSession(userId, sessionData) {
        this.ensureInitialized();
        
        const stmt = this.db.prepare(`
            INSERT INTO chat_sessions (
                user_id, title, scenario_id, active_characters, group_mode, metadata
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            userId,
            sessionData.title || null,
            sessionData.scenario_id || null,
            JSON.stringify(sessionData.active_characters || []),
            sessionData.group_mode || 'natural',
            JSON.stringify(sessionData.metadata || {})
        );

        return this.get('SELECT * FROM chat_sessions WHERE rowid = ?', [result.lastInsertRowid]);
    }

    getChatSession(sessionId) {
        this.ensureInitialized();
        const session = this.get('SELECT * FROM chat_sessions WHERE id = ?', [sessionId]);
        return session ? this.parseChatSessionJson(session) : null;
    }

    getChatSessionsByUser(userId, limit = 20) {
        this.ensureInitialized();
        const sessions = this.all(
            'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY last_activity DESC LIMIT ?',
            [userId, limit]
        );
        return sessions.map(sess => this.parseChatSessionJson(sess));
    }

    updateChatSession(sessionId, updates) {
        this.ensureInitialized();
        
        const allowedFields = ['title', 'active_characters', 'group_mode', 'metadata', 'is_archived', 'last_message_at'];
        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                
                if (['active_characters', 'metadata'].includes(key)) {
                    values.push(JSON.stringify(value));
                } else if (key === 'is_archived') {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (setClauses.length === 0) {
            return null;
        }

        values.push(sessionId);
        
        const stmt = this.db.prepare(`
            UPDATE chat_sessions 
            SET ${setClauses.join(', ')}, last_activity = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(values);
        return this.getChatSession(sessionId);
    }

    deleteChatSession(sessionId) {
        this.ensureInitialized();
        const stmt = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?');
        return stmt.run(sessionId);
    }

    /**
     * Parse JSON fields in chat session object
     */
    parseChatSessionJson(session) {
        if (!session) return null;

        return {
            ...session,
            active_characters: this.safeJsonParse(session.active_characters, []),
            metadata: this.safeJsonParse(session.metadata, {}),
            is_archived: Boolean(session.is_archived)
        };
    }

    // ============================================================================
    // MESSAGE OPERATIONS
    // ============================================================================

    createMessage(messageData) {
        this.ensureInitialized();
        
        const stmt = this.db.prepare(`
            INSERT INTO messages (
                session_id, sender_type, sender_id, content, metadata,
                type, character_id, mood_at_time, mood_intensity,
                is_primary_response, response_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            messageData.session_id,
            messageData.sender_type,
            messageData.sender_id || null,
            messageData.content,
            JSON.stringify(messageData.metadata || {}),
            messageData.type || null,
            messageData.character_id || null,
            messageData.mood_at_time || null,
            messageData.mood_intensity || null,
            messageData.is_primary_response ? 1 : 0,
            JSON.stringify(messageData.response_metadata || {})
        );

        // Update session message count and last activity
        this.run(
            'UPDATE chat_sessions SET message_count = message_count + 1, last_message_at = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = ?',
            [messageData.session_id]
        );

        return this.get('SELECT * FROM messages WHERE id = ?', [result.lastInsertRowid]);
    }

    getMessagesBySession(sessionId, limit = 100) {
        this.ensureInitialized();
        const messages = this.all(
            'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?',
            [sessionId, limit]
        );
        return messages.map(msg => this.parseMessageJson(msg));
    }

    /**
     * Parse JSON fields in message object
     */
    parseMessageJson(message) {
        if (!message) return null;

        return {
            ...message,
            metadata: this.safeJsonParse(message.metadata, {}),
            response_metadata: this.safeJsonParse(message.response_metadata, {}),
            is_primary_response: Boolean(message.is_primary_response)
        };
    }

    // ============================================================================
    // MEMORY OPERATIONS
    // ============================================================================

    createMemory(characterId, userId, memoryData) {
        this.ensureInitialized();
        
        const stmt = this.db.prepare(`
            INSERT INTO character_memories (
                character_id, user_id, memory_type, content, importance_score,
                emotional_valence, related_session_id, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            characterId,
            userId,
            memoryData.memory_type || 'episodic',
            memoryData.content,
            memoryData.importance_score || 0.5,
            memoryData.emotional_valence || 0.0,
            memoryData.related_session_id || null,
            JSON.stringify(memoryData.tags || [])
        );

        return this.get('SELECT * FROM character_memories WHERE rowid = ?', [result.lastInsertRowid]);
    }

    getMemoriesByCharacter(characterId, userId, limit = 10) {
        this.ensureInitialized();
        const memories = this.all(
            'SELECT * FROM character_memories WHERE character_id = ? AND user_id = ? ORDER BY importance_score DESC, last_accessed DESC LIMIT ?',
            [characterId, userId, limit]
        );
        return memories.map(mem => this.parseMemoryJson(mem));
    }

    updateMemoryAccess(memoryId) {
        this.ensureInitialized();
        this.run(
            'UPDATE character_memories SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
            [memoryId]
        );
    }

    clearMemoriesForCharacter(characterId, userId) {
        this.ensureInitialized();
        return this.run(
            'DELETE FROM character_memories WHERE character_id = ? AND user_id = ?',
            [characterId, userId]
        );
    }

    parseMemoryJson(memory) {
        if (!memory) return null;
        return {
            ...memory,
            tags: this.safeJsonParse(memory.tags, [])
        };
    }

    // ============================================================================
    // RELATIONSHIP OPERATIONS
    // ============================================================================

    getRelationship(characterId, userId, targetType = 'user') {
        this.ensureInitialized();
        return this.get(
            'SELECT * FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_type = ?',
            [characterId, userId, targetType]
        );
    }

    createOrUpdateRelationship(characterId, userId, relationshipData) {
        this.ensureInitialized();
        
        const existing = this.get(
            'SELECT id FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_type = ?',
            [characterId, userId, relationshipData.target_type || 'user']
        );

        if (existing) {
            // Update existing
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
                this.run(
                    `UPDATE character_relationships SET ${setClauses.join(', ')} WHERE id = ?`,
                    values
                );
            }
        } else {
            // Create new
            this.run(
                `INSERT INTO character_relationships (
                    character_id, user_id, target_type, target_id, relationship_type,
                    trust_level, familiarity_level, emotional_bond, custom_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    characterId,
                    userId,
                    relationshipData.target_type || 'user',
                    relationshipData.target_id || userId,
                    relationshipData.relationship_type || 'neutral',
                    relationshipData.trust_level || 0.5,
                    relationshipData.familiarity_level || 0.1,
                    relationshipData.emotional_bond || 0.0,
                    relationshipData.custom_context || null
                ]
            );
        }

        return this.getRelationship(characterId, userId, relationshipData.target_type || 'user');
    }

    // ============================================================================
    // CHARACTER SESSION STATE OPERATIONS
    // ============================================================================

    getSessionState(characterId, sessionId, userId) {
        this.ensureInitialized();
        const state = this.get(
            'SELECT * FROM character_session_state WHERE character_id = ? AND session_id = ? AND user_id = ?',
            [characterId, sessionId, userId]
        );
        return state ? this.parseSessionStateJson(state) : null;
    }

    createOrUpdateSessionState(characterId, sessionId, userId, stateData) {
        this.ensureInitialized();
        
        const existing = this.get(
            'SELECT id FROM character_session_state WHERE character_id = ? AND session_id = ? AND user_id = ?',
            [characterId, sessionId, userId]
        );

        if (existing) {
            // Update
            const setClauses = [];
            const values = [];

            for (const [key, value] of Object.entries(stateData)) {
                if (['current_mood', 'mood_intensity', 'energy_level', 'engagement_score', 'active_topics', 'conversation_context'].includes(key)) {
                    setClauses.push(`${key} = ?`);
                    if (['active_topics', 'conversation_context'].includes(key)) {
                        values.push(JSON.stringify(value));
                    } else {
                        values.push(value);
                    }
                }
            }

            if (setClauses.length > 0) {
                values.push(existing.id);
                this.run(
                    `UPDATE character_session_state SET ${setClauses.join(', ')} WHERE id = ?`,
                    values
                );
            }
        } else {
            // Create
            this.run(
                `INSERT INTO character_session_state (
                    character_id, session_id, user_id, current_mood, mood_intensity,
                    energy_level, engagement_score, active_topics, conversation_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    characterId,
                    sessionId,
                    userId,
                    stateData.current_mood || 'neutral',
                    stateData.mood_intensity || 0.5,
                    stateData.energy_level || 0.7,
                    stateData.engagement_score || 0.5,
                    JSON.stringify(stateData.active_topics || []),
                    JSON.stringify(stateData.conversation_context || {})
                ]
            );
        }

        return this.getSessionState(characterId, sessionId, userId);
    }

    parseSessionStateJson(state) {
        if (!state) return null;
        return {
            ...state,
            active_topics: this.safeJsonParse(state.active_topics, []),
            conversation_context: this.safeJsonParse(state.conversation_context, {})
        };
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Safely parse JSON string
     */
    safeJsonParse(jsonString, defaultValue = null) {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return defaultValue;
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        this.ensureInitialized();
        
        return {
            characters: this.get('SELECT COUNT(*) as count FROM characters')?.count || 0,
            scenarios: this.get('SELECT COUNT(*) as count FROM scenarios')?.count || 0,
            chatSessions: this.get('SELECT COUNT(*) as count FROM chat_sessions')?.count || 0,
            messages: this.get('SELECT COUNT(*) as count FROM messages')?.count || 0,
            memories: this.get('SELECT COUNT(*) as count FROM character_memories')?.count || 0,
            dbSize: fs.statSync(this.dbPath).size
        };
    }
}

// Export singleton instance
let instance = null;

module.exports = {
    LocalDatabaseService,
    getInstance: (dbPath = null) => {
        if (!instance) {
            instance = new LocalDatabaseService(dbPath);
        }
        return instance;
    }
};
