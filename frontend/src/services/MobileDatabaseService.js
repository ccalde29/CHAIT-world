/**
 * Mobile Database Service
 * Replaces Node.js backend with Capacitor SQLite plugin for iOS/Android
 * Provides same API as backend DatabaseService but runs in-app
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

class MobileDatabaseService {
  constructor() {
    this.sqlite = null;
    this.db = null;
    this.dbName = 'chaitworld.db';
    this.isInitialized = false;
  }

  /**
   * Initialize SQLite database
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create SQLite connection
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      
      // Check if database exists
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (ret.result && isConn) {
        // Retrieve existing connection
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        // Create new connection
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      // Open database
      await this.db.open();

      // Initialize schema
      await this.initializeSchema();

      this.isInitialized = true;
      console.log('[MobileDB] Database initialized successfully');
    } catch (error) {
      console.error('[MobileDB] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    // Import schema from shared location
    const schema = await this.getSchema();
    
    try {
      await this.db.execute(schema);
      console.log('[MobileDB] Schema initialized');
    } catch (error) {
      console.error('[MobileDB] Schema initialization error:', error);
      throw error;
    }
  }

  /**
   * Get database schema SQL
   * This should match backend/database/schema.sql
   */
  async getSchema() {
    // For now, return minimal schema - we'll expand this
    return `
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        sex TEXT,
        personality TEXT,
        appearance TEXT,
        background TEXT,
        avatar TEXT,
        color TEXT,
        chat_examples TEXT,
        relationships TEXT,
        tags TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 150,
        context_window INTEGER DEFAULT 4000,
        memory_enabled INTEGER DEFAULT 1,
        avatar_image_url TEXT,
        avatar_image_filename TEXT,
        uses_custom_image INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        is_modified_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        initial_message TEXT,
        atmosphere TEXT,
        background_image_url TEXT,
        background_image_filename TEXT,
        uses_custom_background INTEGER DEFAULT 0,
        narrator_enabled INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        scenario_id TEXT,
        title TEXT,
        active_characters TEXT,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        character_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_settings_local (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE,
        api_keys TEXT,
        ollama_settings TEXT DEFAULT '{"baseUrl": "http://localhost:11434"}',
        lmstudio_settings TEXT DEFAULT '{"baseUrl": "http://localhost:1234"}',
        default_provider TEXT DEFAULT 'openai',
        default_model TEXT,
        active_persona_id TEXT,
        is_admin INTEGER DEFAULT 0,
        auto_approve_characters INTEGER DEFAULT 0,
        admin_system_prompt TEXT,
        group_dynamics_mode TEXT DEFAULT 'natural',
        message_delay INTEGER DEFAULT 1200,
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_personas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS character_memories (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        memory_type TEXT,
        content TEXT NOT NULL,
        importance REAL DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS character_relationships (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship_type TEXT,
        trust_level REAL DEFAULT 0.5,
        familiarity_level REAL DEFAULT 0.5,
        emotional_bond REAL DEFAULT 0.0,
        custom_context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, user_id, target_id)
      );
    `;
  }

  /**
   * Execute SQL query
   */
  async query(sql, params = []) {
    try {
      const result = await this.db.query(sql, params);
      return result.values || [];
    } catch (error) {
      console.error('[MobileDB] Query error:', error);
      throw error;
    }
  }

  /**
   * Execute SQL statement (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    try {
      const result = await this.db.run(sql, params);
      return {
        changes: result.changes?.changes || 0,
        lastId: result.changes?.lastId || null
      };
    } catch (error) {
      console.error('[MobileDB] Run error:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      await this.sqlite.closeConnection(this.dbName, false);
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
let instance = null;

export const getMobileDatabaseService = () => {
  if (!instance) {
    instance = new MobileDatabaseService();
  }
  return instance;
};

export default MobileDatabaseService;
