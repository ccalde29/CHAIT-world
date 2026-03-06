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
                // Run migrations for existing databases
                this.runMigrations();
                return;
            }

            // Fresh install — read and execute the full schema inside a transaction
            // so a partial failure doesn't leave the DB in a broken state
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            if (!fs.existsSync(schemaPath)) {
                throw new Error(`Schema file not found at: ${schemaPath}`);
            }
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Run entire schema as a single transaction
            const runSchema = this.db.transaction(() => {
                this.db.exec(schema);
            });
            runSchema();

            console.log('[DB] Schema initialized successfully from schema.sql');
        } catch (error) {
            console.error('[DB] Failed to initialize schema:', error);
            throw error;
        }
    }

    /**
     * Run migrations to update existing database schemas
     */
    runMigrations() {
        try {
            // Check if user_settings_local table has the new columns
            const tableInfo = this.db.prepare("PRAGMA table_info(user_settings_local)").all();
            const columnNames = tableInfo.map(col => col.name);

            // Add missing columns if they don't exist
            if (!columnNames.includes('group_dynamics_mode')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN group_dynamics_mode TEXT DEFAULT 'natural'");
            }

            if (!columnNames.includes('message_delay')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN message_delay INTEGER DEFAULT 1200");
            }

            if (!columnNames.includes('admin_system_prompt')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN admin_system_prompt TEXT");
            }

            if (!columnNames.includes('is_admin')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN is_admin INTEGER DEFAULT 0");
            }

            if (!columnNames.includes('auto_approve_characters')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN auto_approve_characters INTEGER DEFAULT 0");
            }

            if (!columnNames.includes('use_ai_memory_extraction')) {
                this.db.exec("ALTER TABLE user_settings_local ADD COLUMN use_ai_memory_extraction INTEGER DEFAULT 0");
            }

            // Add target tracking columns to character_memories table
            const memTableInfo = this.db.prepare("PRAGMA table_info(character_memories)").all();
            const memColumnNames = memTableInfo.map(col => col.name);

            if (!memColumnNames.includes('target_type')) {
                this.db.exec(`
                    ALTER TABLE character_memories ADD COLUMN target_type TEXT DEFAULT 'user' CHECK(target_type IN ('user', 'character', 'general'));
                `);
            }

            if (!memColumnNames.includes('target_entity')) {
                this.db.exec(`
                    ALTER TABLE character_memories ADD COLUMN target_entity TEXT;
                `);
            }

            // Create index for character-to-character memories
            if (!memColumnNames.includes('target_type')) {
                this.db.exec(`
                    CREATE INDEX IF NOT EXISTS idx_memories_target ON character_memories(target_type, target_entity);
                `);
            }

            // Create memory system tables if they don't exist
            const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableNames = tables.map(t => t.name);

            if (!tableNames.includes('character_learning')) {
                this.db.exec(`
                    CREATE TABLE character_learning (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        character_id TEXT NOT NULL,
                        learning_type TEXT CHECK(learning_type IN ('communication_style', 'topic_preference', 'emotional_response', 'humor_style')),
                        pattern_data TEXT NOT NULL,
                        confidence_score REAL DEFAULT 0.5 CHECK(confidence_score >= 0 AND confidence_score <= 1),
                        usage_count INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                        UNIQUE(character_id, learning_type)
                    );
                    CREATE INDEX idx_learning_character ON character_learning(character_id);
                    CREATE INDEX idx_learning_type ON character_learning(learning_type);
                `);
            }

            if (!tableNames.includes('character_topic_engagement')) {
                this.db.exec(`
                    CREATE TABLE character_topic_engagement (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        character_id TEXT NOT NULL,
                        topic TEXT NOT NULL,
                        interest_level REAL DEFAULT 0.5 CHECK(interest_level >= 0 AND interest_level <= 1),
                        times_discussed INTEGER DEFAULT 1,
                        last_discussed DATETIME DEFAULT CURRENT_TIMESTAMP,
                        emotional_association REAL DEFAULT 0.0 CHECK(emotional_association >= -1 AND emotional_association <= 1),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                        UNIQUE(character_id, topic)
                    );
                    CREATE INDEX idx_topic_engagement_character ON character_topic_engagement(character_id);
                    CREATE INDEX idx_topic_engagement_interest ON character_topic_engagement(interest_level);
                `);
            }

            // Add granular model parameter columns to characters table
            const charTableInfo = this.db.prepare("PRAGMA table_info(characters)").all();
            const charColumnNames = charTableInfo.map(col => col.name);

            if (!charColumnNames.includes('top_p')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN top_p REAL DEFAULT NULL");
            }
            if (!charColumnNames.includes('frequency_penalty')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN frequency_penalty REAL DEFAULT NULL");
            }
            if (!charColumnNames.includes('presence_penalty')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN presence_penalty REAL DEFAULT NULL");
            }
            if (!charColumnNames.includes('repetition_penalty')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN repetition_penalty REAL DEFAULT NULL");
            }
            if (!charColumnNames.includes('stop_sequences')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN stop_sequences TEXT DEFAULT NULL");
            }

            // Add granular model parameter columns to custom_models table
            const customModelTableInfo = this.db.prepare("PRAGMA table_info(custom_models)").all();
            const customModelColumnNames = customModelTableInfo.map(col => col.name);

            if (!customModelColumnNames.includes('display_name')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN display_name TEXT");
                // Backfill display_name from name for existing rows
                this.db.exec("UPDATE custom_models SET display_name = name WHERE display_name IS NULL");
            }
            if (!customModelColumnNames.includes('custom_system_prompt')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN custom_system_prompt TEXT DEFAULT NULL");
            }
            if (!customModelColumnNames.includes('top_p')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN top_p REAL DEFAULT NULL");
            }
            if (!customModelColumnNames.includes('frequency_penalty')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN frequency_penalty REAL DEFAULT NULL");
            }
            if (!customModelColumnNames.includes('presence_penalty')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN presence_penalty REAL DEFAULT NULL");
            }
            if (!customModelColumnNames.includes('repetition_penalty')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN repetition_penalty REAL DEFAULT NULL");
            }
            if (!customModelColumnNames.includes('stop_sequences')) {
                this.db.exec("ALTER TABLE custom_models ADD COLUMN stop_sequences TEXT DEFAULT NULL");
            }

            // Personality evolution columns on characters
            if (!charColumnNames.includes('personality_size')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN personality_size TEXT DEFAULT 'small'");
            }
            if (!charColumnNames.includes('personality_growth')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN personality_growth TEXT DEFAULT NULL");
            }
            if (!charColumnNames.includes('memory_compile_interval')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN memory_compile_interval INTEGER DEFAULT 20");
            }
            if (!charColumnNames.includes('messages_since_compile')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN messages_since_compile INTEGER DEFAULT 0");
            }
            if (!charColumnNames.includes('personality_compiled_at')) {
                this.db.exec("ALTER TABLE characters ADD COLUMN personality_compiled_at DATETIME DEFAULT NULL");
            }

            // compiled flag on character_memories
            const memTableInfo2 = this.db.prepare("PRAGMA table_info(character_memories)").all();
            const memColumnNames2 = memTableInfo2.map(col => col.name);
            if (!memColumnNames2.includes('compiled')) {
                this.db.exec("ALTER TABLE character_memories ADD COLUMN compiled INTEGER DEFAULT 0");
            }

        } catch (error) {
            console.error('Failed to run migrations:', error);
            // Don't throw - allow app to continue
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
                uses_custom_image, is_default, original_id,
                top_p, frequency_penalty, presence_penalty, repetition_penalty, stop_sequences,
                personality_size, memory_compile_interval
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
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
            characterData.original_id || null,
            characterData.top_p ?? null,
            characterData.frequency_penalty ?? null,
            characterData.presence_penalty ?? null,
            characterData.repetition_penalty ?? null,
            characterData.stop_sequences ? JSON.stringify(characterData.stop_sequences) : null,
            characterData.personality_size || 'small',
            characterData.memory_compile_interval || 20
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
            'uses_custom_image',
            'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'stop_sequences',
            'personality_size', 'personality_growth', 'memory_compile_interval', 'messages_since_compile'
        ];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);

                // Handle JSON fields
                if (['chat_examples', 'relationships', 'tags', 'voice_traits', 'speech_patterns'].includes(key)) {
                    values.push(JSON.stringify(value));
                } else if (key === 'stop_sequences') {
                    values.push(value ? JSON.stringify(value) : null);
                } else if (['memory_enabled', 'uses_custom_image'].includes(key)) {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value ?? null);
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

    // ============================================================================
    // PERSONALITY EVOLUTION HELPERS
    // ============================================================================

    incrementCompileCounter(characterId) {
        this.ensureInitialized();
        this.db.prepare(
            'UPDATE characters SET messages_since_compile = messages_since_compile + 1 WHERE id = ?'
        ).run(characterId);
        return this.getCharacter(characterId);
    }

    getUncompiledMemories(characterId, userId) {
        this.ensureInitialized();
        return this.all(
            `SELECT * FROM character_memories
             WHERE character_id = ? AND user_id = ? AND compiled = 0
             ORDER BY importance_score DESC, created_at DESC`,
            [characterId, userId]
        );
    }

    markMemoriesAsCompiled(characterId, userId) {
        this.ensureInitialized();
        this.db.prepare(
            'UPDATE character_memories SET compiled = 1 WHERE character_id = ? AND user_id = ? AND compiled = 0'
        ).run(characterId, userId);
    }

    savePersonalityGrowth(characterId, growthText) {
        this.ensureInitialized();
        this.db.prepare(
            `UPDATE characters
             SET personality_growth = ?, messages_since_compile = 0, personality_compiled_at = CURRENT_TIMESTAMP
             WHERE id = ?`
        ).run(growthText, characterId);
    }

    clearPersonalityGrowth(characterId) {
        this.ensureInitialized();
        this.db.prepare(
            `UPDATE characters
             SET personality_growth = NULL, messages_since_compile = 0, personality_compiled_at = NULL
             WHERE id = ?`
        ).run(characterId);
    }

    // ============================================================================
    // CUSTOM MODEL PRESETS (local SQLite)
    // ============================================================================

    getCustomModels(userId) {
        this.ensureInitialized();
        // Return global presets (user_id IS NULL) AND user-specific presets
        const rows = this.all(
            `SELECT * FROM custom_models WHERE (user_id IS NULL OR user_id = ?) AND is_active = 1 ORDER BY created_at DESC`,
            [userId]
        );
        return rows.map(r => this.parseCustomModelJson(r));
    }

    getCustomModel(id) {
        this.ensureInitialized();
        const row = this.get('SELECT * FROM custom_models WHERE id = ?', [id]);
        return row ? this.parseCustomModelJson(row) : null;
    }

    createCustomModel(userId, data) {
        this.ensureInitialized();
        const stmt = this.db.prepare(`
            INSERT INTO custom_models (
                user_id, name, display_name, description, provider, model_id,
                custom_system_prompt, temperature, max_tokens,
                top_p, frequency_penalty, presence_penalty, repetition_penalty, stop_sequences,
                tags, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        const result = stmt.run(
            userId,
            data.name,
            data.display_name || data.name,
            data.description || null,
            data.provider,
            data.model_id,
            data.custom_system_prompt || null,
            data.temperature ?? 0.8,
            data.max_tokens || 150,
            data.top_p ?? null,
            data.frequency_penalty ?? null,
            data.presence_penalty ?? null,
            data.repetition_penalty ?? null,
            data.stop_sequences ? JSON.stringify(data.stop_sequences) : null,
            JSON.stringify(data.tags || [])
        );
        return this.getCustomModel(this.db.prepare('SELECT last_insert_rowid() as id').get()['last_insert_rowid()']);
    }

    updateCustomModel(id, updates) {
        this.ensureInitialized();
        const allowed = [
            'name', 'display_name', 'description', 'provider', 'model_id',
            'custom_system_prompt', 'temperature', 'max_tokens',
            'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty',
            'stop_sequences', 'tags', 'is_active'
        ];
        const setClauses = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (allowed.includes(key)) {
                setClauses.push(`${key} = ?`);
                if (key === 'stop_sequences') values.push(value ? JSON.stringify(value) : null);
                else if (key === 'tags') values.push(JSON.stringify(value || []));
                else values.push(value ?? null);
            }
        }
        if (setClauses.length === 0) return this.getCustomModel(id);
        values.push(id);
        this.db.prepare(`UPDATE custom_models SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(values);
        return this.getCustomModel(id);
    }

    deleteCustomModel(id) {
        this.ensureInitialized();
        return this.db.prepare('DELETE FROM custom_models WHERE id = ?').run(id);
    }

    parseCustomModelJson(row) {
        if (!row) return null;
        return {
            ...row,
            tags: this.safeJsonParse(row.tags, []),
            stop_sequences: this.safeJsonParse(row.stop_sequences, null),
            is_active: Boolean(row.is_active)
        };
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
            stop_sequences: this.safeJsonParse(character.stop_sequences, null),
            memory_enabled: Boolean(character.memory_enabled),
            uses_custom_image: Boolean(character.uses_custom_image),
            is_default: Boolean(character.is_default),
            is_modified_default: Boolean(character.is_modified_default)
        };
    }

    // ============================================================================
    // USER SETTINGS OPERATIONS
    // ============================================================================

    getUserSettings(userId) {
        this.ensureInitialized();
        
        const localSettings = this.get(
            'SELECT * FROM user_settings_local WHERE user_id = ?',
            [userId]
        );

        if (localSettings) {
            // Return in frontend-expected format (camelCase)
            return {
                userId: localSettings.user_id,
                apiKeys: this.safeJsonParse(localSettings.api_keys, {}),
                ollamaSettings: this.safeJsonParse(localSettings.ollama_settings, { baseUrl: 'http://localhost:11434' }),
                lmStudioSettings: this.safeJsonParse(localSettings.lmstudio_settings, { baseUrl: 'http://localhost:1234' }),
                groupDynamicsMode: localSettings.group_dynamics_mode || 'natural',
                messageDelay: localSettings.message_delay || 1200,
                defaultProvider: localSettings.default_provider || 'openai',
                defaultModel: localSettings.default_model,
                activePersonaId: localSettings.active_persona_id,
                isAdmin: localSettings.is_admin === 1
                // autoApproveCharacters and adminSystemPrompt now fetched from Supabase in database.js
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
            isAdmin: false
            // autoApproveCharacters and adminSystemPrompt now fetched from Supabase in database.js
        };
    }

    updateUserSettings(userId, updates) {
        this.ensureInitialized();
        
        // Normalize keys (handle both camelCase from frontend and snake_case from DB)
        // Note: autoApproveCharacters and adminSystemPrompt are now handled in database.js via Supabase
        const normalized = {
            api_keys: updates.apiKeys || updates.api_keys || {},
            ollama_settings: updates.ollamaSettings || updates.ollama_settings || { baseUrl: 'http://localhost:11434' },
            lmstudio_settings: updates.lmStudioSettings || updates.lmstudio_settings || { baseUrl: 'http://localhost:1234' },
            preferences: updates.preferences || {},
            default_provider: updates.defaultProvider || updates.default_provider || 'openai',
            default_model: updates.defaultModel || updates.default_model || null,
            group_dynamics_mode: updates.groupDynamicsMode || updates.group_dynamics_mode || 'natural',
            message_delay: updates.messageDelay || updates.message_delay || 1200
        };

        // Check if settings exist
        const existing = this.get(
            'SELECT id FROM user_settings_local WHERE user_id = ?',
            [userId]
        );

        if (existing) {
            // Update existing settings
            this.run(
                `UPDATE user_settings_local 
                 SET api_keys = ?, 
                     ollama_settings = ?, 
                     lmstudio_settings = ?,
                     preferences = ?,
                     default_provider = ?,
                     default_model = ?,
                     group_dynamics_mode = ?,
                     message_delay = ?,
                     auto_approve_characters = ?,
                     admin_system_prompt = ?
                 WHERE user_id = ?`,
                [
                    JSON.stringify(normalized.api_keys),
                    JSON.stringify(normalized.ollama_settings),
                    JSON.stringify(normalized.lmstudio_settings),
                    JSON.stringify(normalized.preferences),
                    normalized.default_provider,
                    normalized.default_model,
                    normalized.group_dynamics_mode,
                    normalized.message_delay,
                    normalized.auto_approve_characters ? 1 : 0,
                    normalized.admin_system_prompt,
                    userId
                ]
            );
        } else {
            // Insert new settings
            this.run(
                `INSERT INTO user_settings_local (
                    user_id, api_keys, ollama_settings, lmstudio_settings, 
                    preferences, default_provider, default_model, 
                    group_dynamics_mode, message_delay, 
                    auto_approve_characters, admin_system_prompt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    JSON.stringify(normalized.api_keys),
                    JSON.stringify(normalized.ollama_settings),
                    JSON.stringify(normalized.lmstudio_settings),
                    JSON.stringify(normalized.preferences),
                    normalized.default_provider,
                    normalized.default_model,
                    normalized.group_dynamics_mode,
                    normalized.message_delay,
                    normalized.auto_approve_characters ? 1 : 0,
                    normalized.admin_system_prompt
                ]
            );
        }

        return this.getUserSettings(userId);
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
                emotional_valence, related_session_id, tags, target_type, target_entity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            characterId,
            userId,
            memoryData.memory_type || 'episodic',
            memoryData.content,
            memoryData.importance_score || 0.5,
            memoryData.emotional_valence || 0.0,
            memoryData.related_session_id || null,
            JSON.stringify(memoryData.tags || []),
            memoryData.target_type || 'user',
            memoryData.target_entity || userId
        );

        return this.get('SELECT * FROM character_memories WHERE rowid = ?', [result.lastInsertRowid]);
    }

    getMemoriesByCharacter(characterId, userId, limit = 10, filters = {}) {
        this.ensureInitialized();
        
        let query = 'SELECT * FROM character_memories WHERE character_id = ? AND user_id = ?';
        const params = [characterId, userId];
        
        // Add filters for target_type and target_entity if provided
        if (filters.target_type) {
            query += ' AND target_type = ?';
            params.push(filters.target_type);
        }
        if (filters.target_entity) {
            query += ' AND target_entity = ?';
            params.push(filters.target_entity);
        }
        
        query += ' ORDER BY importance_score DESC, last_accessed DESC LIMIT ?';
        params.push(limit);
        
        const memories = this.all(query, params);
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

    /**
     * Get memories across all sessions with recency weighting
     */
    getMemoriesAcrossSessions(characterId, userId, limit = 15) {
        this.ensureInitialized();
        
        const memories = this.all(
            `SELECT * FROM (
                SELECT *, 
                    CASE 
                      WHEN last_accessed > datetime('now', '-7 days') THEN 1.0
                      WHEN last_accessed > datetime('now', '-30 days') THEN 0.7
                      WHEN last_accessed > datetime('now', '-90 days') THEN 0.4
                      ELSE 0.2
                    END as recency_weight,
                    importance_score * (
                      CASE 
                        WHEN last_accessed > datetime('now', '-7 days') THEN 1.0
                        WHEN last_accessed > datetime('now', '-30 days') THEN 0.7
                        WHEN last_accessed > datetime('now', '-90 days') THEN 0.4
                        ELSE 0.2
                      END
                    ) as weighted_score
                FROM character_memories
                WHERE character_id = ? AND user_id = ?
             ) ORDER BY weighted_score DESC, created_at DESC
             LIMIT ?`,
            [characterId, userId, limit]
        );
        
        return memories.map(mem => this.parseMemoryJson(mem));
    }

    // ============================================================================
    // CHARACTER LEARNING OPERATIONS
    // ============================================================================

    /**
     * Get learning patterns for a character
     */
    getCharacterLearning(characterId, learningType = null) {
        this.ensureInitialized();
        
        if (learningType) {
            const result = this.get(
                'SELECT * FROM character_learning WHERE character_id = ? AND learning_type = ?',
                [characterId, learningType]
            );
            return result ? this.parseLearningJson(result) : null;
        }
        
        const results = this.all(
            'SELECT * FROM character_learning WHERE character_id = ?',
            [characterId]
        );
        return results.map(r => this.parseLearningJson(r));
    }

    /**
     * Create or update a learning pattern
     */
    createOrUpdateLearning(characterId, learningType, patternData, confidenceScore = 0.5) {
        this.ensureInitialized();
        
        const existing = this.get(
            'SELECT id FROM character_learning WHERE character_id = ? AND learning_type = ?',
            [characterId, learningType]
        );
        
        if (existing) {
            // Update existing pattern
            this.run(
                `UPDATE character_learning 
                 SET pattern_data = ?, 
                     confidence_score = ?,
                     usage_count = usage_count + 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [JSON.stringify(patternData), confidenceScore, existing.id]
            );
            
            return this.parseLearningJson(
                this.get('SELECT * FROM character_learning WHERE id = ?', [existing.id])
            );
        } else {
            // Create new
            const stmt = this.db.prepare(
                `INSERT INTO character_learning (character_id, learning_type, pattern_data, confidence_score)
                 VALUES (?, ?, ?, ?)`
            );
            
            const result = stmt.run(characterId, learningType, JSON.stringify(patternData), confidenceScore);
            return this.parseLearningJson(
                this.get('SELECT * FROM character_learning WHERE rowid = ?', [result.lastInsertRowid])
            );
        }
    }

    /**
     * Increment usage count for a learning pattern
     */
    incrementLearningUsage(learningId) {
        this.ensureInitialized();
        this.run(
            'UPDATE character_learning SET usage_count = usage_count + 1 WHERE id = ?',
            [learningId]
        );
    }

    /**
     * Delete learning patterns for a character
     */
    deleteLearningPatterns(characterId, learningType = null) {
        this.ensureInitialized();
        
        if (learningType) {
            return this.run(
                'DELETE FROM character_learning WHERE character_id = ? AND learning_type = ?',
                [characterId, learningType]
            );
        }
        
        return this.run(
            'DELETE FROM character_learning WHERE character_id = ?',
            [characterId]
        );
    }

    /**
     * Parse JSON in learning pattern
     */
    parseLearningJson(learning) {
        if (!learning) return null;
        return {
            ...learning,
            pattern_data: this.safeJsonParse(learning.pattern_data, {})
        };
    }

    // ============================================================================
    // TOPIC ENGAGEMENT OPERATIONS
    // ============================================================================

    /**
     * Get topic engagement for a character
     */
    getTopicEngagement(characterId, topic = null) {
        this.ensureInitialized();
        
        if (topic) {
            return this.get(
                'SELECT * FROM character_topic_engagement WHERE character_id = ? AND topic = ?',
                [characterId, topic]
            );
        }
        
        return this.all(
            'SELECT * FROM character_topic_engagement WHERE character_id = ? ORDER BY interest_level DESC, times_discussed DESC',
            [characterId]
        );
    }

    /**
     * Get top interests for a character
     */
    getTopInterests(characterId, limit = 5) {
        this.ensureInitialized();
        
        return this.all(
            'SELECT * FROM character_topic_engagement WHERE character_id = ? ORDER BY interest_level DESC, times_discussed DESC LIMIT ?',
            [characterId, limit]
        );
    }

    /**
     * Create or update topic engagement
     */
    createOrUpdateTopicEngagement(characterId, topic, interestDelta = 0.1, emotionalAssociation = 0.0) {
        this.ensureInitialized();
        
        const existing = this.get(
            'SELECT * FROM character_topic_engagement WHERE character_id = ? AND topic = ?',
            [characterId, topic]
        );
        
        if (existing) {
            // Update: increase times_discussed, adjust interest_level
            const newInterestLevel = Math.max(0, Math.min(1, existing.interest_level + interestDelta));
            const newEmotionalAssoc = Math.max(-1, Math.min(1, 
                (existing.emotional_association * 0.7 + emotionalAssociation * 0.3)
            ));
            
            this.run(
                `UPDATE character_topic_engagement 
                 SET interest_level = ?,
                     times_discussed = times_discussed + 1,
                     last_discussed = CURRENT_TIMESTAMP,
                     emotional_association = ?
                 WHERE id = ?`,
                [newInterestLevel, newEmotionalAssoc, existing.id]
            );
            
            return this.get('SELECT * FROM character_topic_engagement WHERE id = ?', [existing.id]);
        } else {
            // Create new
            const stmt = this.db.prepare(
                `INSERT INTO character_topic_engagement (character_id, topic, interest_level, emotional_association)
                 VALUES (?, ?, ?, ?)`
            );
            
            const result = stmt.run(characterId, topic, 0.5 + interestDelta, emotionalAssociation);
            return this.get('SELECT * FROM character_topic_engagement WHERE rowid = ?', [result.lastInsertRowid]);
        }
    }

    /**
     * Delete topic engagement
     */
    deleteTopicEngagement(characterId, topic = null) {
        this.ensureInitialized();
        
        if (topic) {
            return this.run(
                'DELETE FROM character_topic_engagement WHERE character_id = ? AND topic = ?',
                [characterId, topic]
            );
        }
        
        return this.run(
            'DELETE FROM character_topic_engagement WHERE character_id = ?',
            [characterId]
        );
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

    getRelationshipsForCharacter(characterId, userId, targetType = null) {
        this.ensureInitialized();
        if (targetType) {
            return this.all(
                'SELECT * FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_type = ? ORDER BY created_at DESC',
                [characterId, userId, targetType]
            );
        }
        return this.all(
            'SELECT * FROM character_relationships WHERE character_id = ? AND user_id = ? ORDER BY created_at DESC',
            [characterId, userId]
        );
    }

    deleteRelationship(characterId, userId, targetId) {
        this.ensureInitialized();
        return this.run(
            'DELETE FROM character_relationships WHERE character_id = ? AND user_id = ? AND target_id = ?',
            [characterId, userId, targetId]
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
