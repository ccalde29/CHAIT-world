// backend/services/database.js
// Fixed version with proper memory processing and character interactions

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class DatabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }
        
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        this.encryptionKey = crypto
        .createHash('sha256')
        .update(process.env.ENCRYPTION_KEY)
        .digest();
    }
    
    // ============================================================================
    // ENCRYPTION UTILITIES
    // ============================================================================
    
    encryptApiKey(text) {
        if (!text) return null;
        
        try {
            const algorithm = 'aes-256-gcm';
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: 'aes-256-gcm',
                version: 1
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt API key securely');
        }
    }
    
    decryptApiKey(encryptedData) {
        if (!encryptedData) return null;
        
        try {
            if (encryptedData.algorithm === 'base64') {
                console.warn('WARNING: Found legacy base64 encoded API key');
                return Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
            }
            
            if (encryptedData.algorithm === 'aes-256-gcm') {
                const iv = Buffer.from(encryptedData.iv, 'hex');
                const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
                decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
                
                let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                
                return decrypted;
            }
            
            throw new Error('Unknown encryption algorithm');
            
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt API key');
        }
    }
    
    // ============================================================================
    // CHAT SESSION & MESSAGE MANAGEMENT - FIXED
    // ============================================================================
    
    /**
     * Create a new chat session - FIXED to return proper session object
     */
    async createChatSession(userId, sessionData) {
        try {
            console.log('📝 Creating chat session for user:', userId);
            
            const { data, error } = await this.supabase
            .from('chat_sessions')
            .insert({
                user_id: userId,
                scenario_id: sessionData.scenario,
                active_characters: sessionData.activeCharacters || [],
                title: sessionData.title || `Chat - ${new Date().toLocaleDateString()}`,
                group_mode: sessionData.groupMode || 'natural',
                message_count: 0
            })
            .select()
            .single();
            
            if (error) {
                console.error('❌ Error creating chat session:', error);
                throw error;
            }
            
            console.log('✅ Chat session created:', data.id);
            return data;
            
        } catch (error) {
            console.error('Database error creating chat session:', error);
            throw error;
        }
    }
    
    /**
     * Save a chat message - FIXED with proper error handling
     */
    async saveChatMessage(sessionId, messageData) {
        try {
            console.log('💬 Saving message to session:', sessionId);
            
            const { data, error } = await this.supabase
            .from('messages')
            .insert({
                session_id: sessionId,
                type: messageData.type,
                content: messageData.content,
                character_id: messageData.character || null,
                timestamp: new Date().toISOString()
            })
            .select()
            .single();
            
            if (error) {
                console.error('❌ Error saving message:', error);
                throw error;
            }
            
            // Update session message count and last activity
            const { data: session } = await this.supabase
              .from('chat_sessions')
              .select('message_count')
              .eq('id', sessionId)
              .single();

            // Then increment it
            await this.supabase
              .from('chat_sessions')
              .update({
                message_count: (session?.message_count || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
            
            console.log('✅ Message saved successfully');
            return data;
            
        } catch (error) {
            console.error('Database error saving chat message:', error);
            // Don't throw - chat should continue even if message save fails
            return null;
        }
    }
    
    /**
     * Get chat session with messages
     */
    async getChatSession(userId, sessionId) {
        try {
            const { data: session, error: sessionError } = await this.supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();
            
            if (sessionError) throw sessionError;
            if (!session) return null;
            
            const { data: messages, error: messagesError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });
            
            if (messagesError) throw messagesError;
            
            return {
                ...session,
                messages: messages || []
            };
            
        } catch (error) {
            console.error('Database error getting chat session:', error);
            throw error;
        }
    }
    
    /**
     * Get chat history for user
     */
    async getChatHistory(userId, limit = 20) {
        try {
            const { data, error } = await this.supabase
            .from('chat_sessions')
            .select(`
                    *,
                    messages (
                        id,
                        content,
                        type,
                        character_id,
                        timestamp
                    )
                `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(limit);
            
            if (error) throw error;
            
            // Format sessions with latest message
            const formattedSessions = data.map(session => ({
                ...session,
                latest_message: session.messages?.[session.messages.length - 1] || null,
                messages: undefined // Remove full messages array from list view
            }));
            
            return formattedSessions;
            
        } catch (error) {
            console.error('Database error getting chat history:', error);
            throw error;
        }
    }
    
    /**
     * Update chat session activity timestamp
     */
    async updateChatSessionActivity(sessionId) {
        try {
            const { error } = await this.supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
            
            if (error) throw error;
            return true;
            
        } catch (error) {
            console.error('Database error updating session activity:', error);
            return false;
        }
    }
    
    /**
     * Update chat session
     */
    async updateChatSession(userId, sessionId, updates) {
        try {
            const { data, error } = await this.supabase
            .from('chat_sessions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .eq('user_id', userId)
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error updating chat session:', error);
            throw error;
        }
    }
    
    /**
     * Delete chat session
     */
    async deleteChatSession(userId, sessionId) {
        try {
            // Delete messages first (cascade should handle this, but being explicit)
            await this.supabase
            .from('messages')
            .delete()
            .eq('session_id', sessionId);
            
            // Delete session
            const { error } = await this.supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', userId);
            
            if (error) throw error;
            return true;
            
        } catch (error) {
            console.error('Database error deleting chat session:', error);
            throw error;
        }
    }
    
    // ============================================================================
    // CHARACTER MANAGEMENT
    // ============================================================================
    
    
    async hideDefaultCharacter(userId, characterId) {
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
    // ============================================================================
    
    async getUserSettings(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (!data) {
                const defaultSettings = {
                    user_id: userId,
                    api_provider: 'openai',
                    ollama_base_url: 'http://localhost:11434',
                    ollama_model: 'llama2',
                    default_scenario: 'coffee-shop',
                    preferences: {
                        responseDelay: true,
                        showTypingIndicator: true,
                        maxCharactersInGroup: 5
                    }
                };
                
                const { data: newSettings, error: createError } = await this.supabase
                    .from('user_settings')
                    .insert(defaultSettings)
                    .select()
                    .single();
                
                if (createError) throw createError;
                
                return this.convertSettingsToFrontend(newSettings);
            }
            
            return this.convertSettingsToFrontend(data);
            
        } catch (error) {
          console.error('Database error getting user settings:', error);
          throw error;
      }
  }
  
  async updateUserSettings(userId, updates) {
      try {
          const dbUpdates = this.convertSettingsToDatabase(updates);
          
          if (updates.apiKeys) {
              if (updates.apiKeys.openai) {
                  dbUpdates.openai_key_encrypted = JSON.stringify(this.encryptApiKey(updates.apiKeys.openai));
              }
              if (updates.apiKeys.anthropic) {
                  dbUpdates.anthropic_key_encrypted = JSON.stringify(this.encryptApiKey(updates.apiKeys.anthropic));
              }
          }
          
          const { data, error } = await this.supabase
              .from('user_settings')
              .upsert({
                  user_id: userId,
                  ...dbUpdates,
                  updated_at: new Date().toISOString()
              })
              .select()
              .single();
          
          if (error) throw error;
          
          return this.convertSettingsToFrontend(data);
          
      } catch (error) {
          console.error('Database error updating user settings:', error);
          throw error;
      }
  }
  
  convertSettingsToFrontend(dbSettings) {
      return {
          user_id: dbSettings.user_id,
          apiProvider: dbSettings.api_provider,
          apiKeys: {
              openai: dbSettings.openai_key_encrypted ? '***configured***' : '',
              anthropic: dbSettings.anthropic_key_encrypted ? '***configured***' : ''
          },
          ollamaSettings: {
              baseUrl: dbSettings.ollama_base_url,
              model: dbSettings.ollama_model
          },
          defaultScenario: dbSettings.default_scenario,
          preferences: dbSettings.preferences || {
              responseDelay: true,
              showTypingIndicator: true,
              maxCharactersInGroup: 5
          },
          created_at: dbSettings.created_at,
          updated_at: dbSettings.updated_at
      };
  }
  
  convertSettingsToDatabase(frontendSettings) {
      const dbSettings = {};
      
      if (frontendSettings.apiProvider !== undefined) {
          dbSettings.api_provider = frontendSettings.apiProvider;
      }
      
      if (frontendSettings.ollamaSettings) {
          if (frontendSettings.ollamaSettings.baseUrl !== undefined) {
              dbSettings.ollama_base_url = frontendSettings.ollamaSettings.baseUrl;
          }
          if (frontendSettings.ollamaSettings.model !== undefined) {
              dbSettings.ollama_model = frontendSettings.ollamaSettings.model;
          }
      }
      
      if (frontendSettings.defaultScenario !== undefined) {
          dbSettings.default_scenario = frontendSettings.defaultScenario;
      }
      
      if (frontendSettings.preferences !== undefined) {
          dbSettings.preferences = frontendSettings.preferences;
      }
         
         return dbSettings;
     }
     
     async getDecryptedApiKeys(userId) {
         try {
             const { data, error } = await this.supabase
                 .from('user_settings')
                 .select('openai_key_encrypted, anthropic_key_encrypted')
                 .eq('user_id', userId)
                 .single();
             
             if (error) throw error;
             
             const apiKeys = {
                 openai: null,
                 anthropic: null
             };
             
             if (data.openai_key_encrypted) {
                 try {
                     const encryptedData = JSON.parse(data.openai_key_encrypted);
                     apiKeys.openai = this.decryptApiKey(encryptedData);
                 } catch (e) {
                     console.error('Error decrypting OpenAI key:', e);
                 }
             }
             
             if (data.anthropic_key_encrypted) {
                 try {
                     const encryptedData = JSON.parse(data.anthropic_key_encrypted);
                     apiKeys.anthropic = this.decryptApiKey(encryptedData);
                 } catch (e) {
                     console.error('Error decrypting Anthropic key:', e);
                 }
             }
             
             return apiKeys;
             
         } catch (error) {
             console.error('Database error getting API keys:', error);
             throw error;
         }
     }

     // ============================================================================
     // USER PERSONA MANAGEMENT
     // ============================================================================
     
     async getUserPersona(userId) {
         try {
             const { data, error } = await this.supabase
                 .from('user_personas')
                 .select('*')
                 .eq('user_id', userId)
                 .eq('is_active', true)
                 .single();
             
             if (error && error.code !== 'PGRST116') {
                 throw error;
             }
             
             if (!data) {
                 return {
                     hasPersona: false,
                     persona: {
                         name: 'User',
                         personality: 'A curious individual engaging in conversation',
                         interests: [],
                         communication_style: 'casual and friendly',
                         avatar: '👤',
                         color: 'from-blue-500 to-indigo-500'
                     }
                 };
             }
             
             return {
                 hasPersona: true,
                 persona: {
                     id: data.id,
                     name: data.name,
                     personality: data.personality,
                     interests: data.interests || [],
                     communication_style: data.communication_style || '',
                     avatar: data.avatar,
                     color: data.color,
                     avatar_image_url: data.avatar_image_url,
                     avatar_image_filename: data.avatar_image_filename,
                     uses_custom_image: data.uses_custom_image,
                     created_at: data.created_at
                 }
             };
             
         } catch (error) {
             console.error('Database error getting user persona:', error);
             throw error;
         }
     }
     
     async createOrUpdateUserPersona(userId, personaData) {
         try {
             await this.supabase
                 .from('user_personas')
                 .update({ is_active: false })
                 .eq('user_id', userId);
             
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

     // ============================================================================
     // SCENARIO MANAGEMENT
     // ============================================================================
     
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
                     context: 'The group is hanging out at a cozy coffee shop on a relaxed afternoon, sharing drinks and casual conversation.',
                     atmosphere: 'relaxed and friendly',
                     is_default: true
                 },
                 {
                     id: 'study-group',
                     name: 'Study Session',
                     description: 'Working on assignments together',
                     context: 'The group is in a study session, working on assignments together but taking breaks to chat and help each other.',
                     atmosphere: 'focused but collaborative',
                     is_default: true
                 },
                 {
                     id: 'party',
                     name: 'House Party',
                     description: 'Weekend party with music and games',
                     context: 'The group is at a weekend house party with music playing, people socializing, and a fun, energetic atmosphere.',
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
     
     async createScenario(userId, scenarioData) {
         try {
             const { data, error } = await this.supabase
                 .from('scenarios')
                 .insert({
                     user_id: userId,
                     name: scenarioData.name,
                     description: scenarioData.description,
                     context: scenarioData.context,
                     atmosphere: scenarioData.atmosphere || 'neutral'
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
     
     async updateScenario(userId, scenarioId, updates) {
         try {
             const { data, error } = await this.supabase
                 .from('scenarios')
                 .update({
                     name: updates.name,
                     description: updates.description,
                     context: updates.context,
                     atmosphere: updates.atmosphere,
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

     // ============================================================================
     // CHARACTER MEMORY MANAGEMENT - FIXED
     // ============================================================================
     
     /**
      * Get character memories with proper ordering
      */
     async getCharacterMemories(characterId, userId, limit = 10) {
         try {
             const { data, error } = await this.supabase
                 .from('character_memories')
                 .select('*')
                 .eq('character_id', characterId)
                 .eq('user_id', userId)
                 .order('importance_score', { ascending: false })
                 .order('last_accessed', { ascending: false })
                 .limit(limit);
             
             if (error) throw error;
             return data || [];
             
         } catch (error) {
             console.error('Database error getting character memories:', error);
             throw error;
         }
     }
     
     /**
      * Add character memory - FIXED to handle all required fields
      */
     async addCharacterMemory(characterId, userId, memoryData) {
         try {
             console.log('🧠 Adding memory for character:', characterId);
             
             const { data, error } = await this.supabase
                 .from('character_memories')
                 .insert({
                     character_id: characterId,
                     user_id: userId,
                     memory_type: memoryData.type || 'fact',
                     target_entity: memoryData.target_entity || userId,
                     memory_content: memoryData.content,
                     importance_score: memoryData.importance_score || 0.5
                 })
                 .select()
                 .single();
             
             if (error) {
                 console.error('❌ Error adding memory:', error);
                throw error;
            }
            
            console.log('✅ Memory added successfully');
            return data;
            
        } catch (error) {
            console.error('Database error adding character memory:', error);
            // Don't throw - memory creation shouldn't break chat
            return null;
        }
    }
    
    /**
     * Clear character memories
     */
    async clearCharacterMemories(characterId, userId) {
        try {
            const { error: memError } = await this.supabase
                .from('character_memories')
                .delete()
                .eq('character_id', characterId)
                .eq('user_id', userId);
            
            if (memError) throw memError;
            
            const { error: relError } = await this.supabase
                .from('character_relationships')
                .delete()
                .eq('character_id', characterId)
                .eq('user_id', userId);
            
            if (relError && relError.code !== 'PGRST116') throw relError;
            
            return { success: true };
            
        } catch (error) {
            console.error('Database error clearing memories:', error);
            throw error;
        }
    }
    
    /**
     * Get character relationship
     */
    async getCharacterRelationship(characterId, userId) {
        try {
            const { data, error } = await this.supabase
                .from('character_relationships')
                .select('*')
                .eq('character_id', characterId)
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (!data) {
                return {
                    relationship_type: 'neutral',
                    trust_level: 0.5,
                    familiarity_level: 0.1,
                    emotional_bond: 0.0,
                    interaction_count: 0
                };
            }
            
            return data;
            
        } catch (error) {
            console.error('Database error getting character relationship:', error);
            throw error;
        }
    }
    
    /**
     * Update character relationship - FIXED
     */
    async updateCharacterRelationship(characterId, userId, relationshipData) {
        try {
            console.log('💞 Updating relationship for character:', characterId);
            
            const { data, error } = await this.supabase
                .from('character_relationships')
                .upsert({
                    character_id: characterId,
                    user_id: userId,
                    relationship_type: relationshipData.relationship_type,
                    trust_level: relationshipData.trust_level,
                    familiarity_level: relationshipData.familiarity_level,
                    emotional_bond: relationshipData.emotional_bond,
                    last_interaction: new Date().toISOString(),
                    interaction_count: relationshipData.interaction_count || 1
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Error updating relationship:', error);
                throw error;
            }
            
            console.log('✅ Relationship updated successfully');
            return data;
            
        } catch (error) {
            console.error('Database error updating character relationship:', error);
            // Don't throw - relationship update shouldn't break chat
            return null;
        }
    }
    
    /**
     * Build character context with all relevant data - FIXED
     */
    async buildCharacterContext(characterId, userId, sessionId = null, otherCharacters = []) {
        try {
            console.log('🔍 Building context for character:', characterId);
            
            const [userPersona, memories, relationship] = await Promise.all([
                this.getUserPersona(userId),
                this.getCharacterMemories(characterId, userId, 5),
                this.getCharacterRelationship(characterId, userId)
            ]);
            
            // NEW: Get recent messages from other characters in this session
            let recentCharacterMessages = [];
            if (sessionId && otherCharacters.length > 0) {
                const { data: messages } = await this.supabase
                    .from('messages')
                    .select('*')
                    .eq('session_id', sessionId)
                    .in('character_id', otherCharacters)
                    .order('timestamp', { ascending: false })
                    .limit(5);
                
                recentCharacterMessages = messages || [];
            }
            
            const context = {
                userPersona: userPersona.persona,
                memories,
                relationship,
                // NEW: Add other characters' recent messages for awareness
                otherCharacterMessages: recentCharacterMessages
            };
            
            console.log('✅ Context built successfully');
            return context;
            
        } catch (error) {
            console.error('Database error building character context:', error);
            // Return minimal context on error
            return {
                userPersona: {
                    name: 'User',
                    personality: 'A person in conversation',
                    interests: [],
                    communication_style: 'casual'
                },
                memories: [],
                relationship: {
                    relationship_type: 'neutral',
                    trust_level: 0.5,
                    familiarity_level: 0.1,
                    emotional_bond: 0.0,
                    interaction_count: 0
                },
                otherCharacterMessages: []
            };
        }
    }
    
    /**
     * Analyze conversation for memories - FIXED with proper userId parameter
     */
    analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId) {
        const memories = [];
        const userText = userMessage.toLowerCase();
        
        console.log('🔍 Analyzing conversation for memories...');
        
        // Enhanced pattern matching
        const patterns = [
            { pattern: /my name is (\w+)/i, type: 'identity', importance: 0.9 },
            { pattern: /i'm (\d+) years? old/i, type: 'demographic', importance: 0.8 },
            { pattern: /i work (?:as|at) ([\w\s]+)/i, type: 'profession', importance: 0.8 },
            { pattern: /i live in ([\w\s]+)/i, type: 'location', importance: 0.7 },
            { pattern: /i'm from ([\w\s]+)/i, type: 'origin', importance: 0.7 },
            { pattern: /my favorite ([\w\s]+) is ([\w\s]+)/i, type: 'preference', importance: 0.6 },
            { pattern: /i (?:feel|am feeling) (sad|happy|excited|angry|frustrated|worried)/i, type: 'emotion', importance: 0.7 },
            { pattern: /i want to ([\w\s]+)/i, type: 'goal', importance: 0.7 },
            { pattern: /my goal is to ([\w\s]+)/i, type: 'goal', importance: 0.8 },
            // Topic/interest patterns
            { pattern: /\b(love|enjoy|like|prefer)\s+(?:to\s+)?(\w+(?:\s+\w+){0,3})/i, type: 'preference', importance: 0.6 },
            { pattern: /\b(hate|dislike|can't stand)\s+(\w+(?:\s+\w+){0,3})/i, type: 'preference', importance: 0.6 },
            { pattern: /story about (.+?)(?:\.|,|$)/i, type: 'topic', importance: 0.5 },
            { pattern: /talking about (.+?)(?:\.|,|$)/i, type: 'topic', importance: 0.5 },
            { pattern: /interested in (.+?)(?:\.|,|$)/i, type: 'interest', importance: 0.7 },
            { pattern: /hobby is (.+?)(?:\.|,|$)/i, type: 'interest', importance: 0.7 },
            // Conversational context
            { pattern: /(?:i'm|i am)\s+(studying|learning|working on)\s+(.+?)(?:\.|,|$)/i, type: 'activity', importance: 0.6 },
            { pattern: /(?:my|our)\s+(\w+)\s+is\s+(.+?)(?:\.|,|$)/i, type: 'personal_fact', importance: 0.6 }
        ];
        
        patterns.forEach(({ pattern, type, importance }) => {
            const match = userMessage.match(pattern);
            if (match) {
                const memoryContent = `User ${type}: ${match[0]}`;
                
                memories.push({
                    type: type,
                    content: memoryContent,
                    importance_score: importance,
                    target_entity: userId
                });
                
                console.log('✅ Found memory:', memoryContent);
            }
            // If no patterns matched but message is substantial, create a general memory
            if (memories.length === 0 && userMessage.length > 75) {
              memories.push({
                type: 'conversation',
                content: `Discussed: ${userMessage.substring(0, 100)}`,
                importance_score: 0.2,
                target_entity: userId
              });
            }
        });
        
        // Boost importance if character showed understanding
        const showsUnderstanding = /i understand|that makes sense|i can see|i hear you/i.test(characterResponse);
        if (showsUnderstanding && memories.length > 0) {
            memories.forEach(memory => {
                memory.importance_score = Math.min(1.0, memory.importance_score + 0.1);
            });
            console.log('✅ Boosted memory importance (character showed understanding)');
        }
        
        console.log(`📊 Total memories found: ${memories.length}`);
        return memories;
    }
    
    /**
     * Calculate relationship update - FIXED
     */
    calculateRelationshipUpdate(currentRelationship, userMessage, characterResponse) {
        let familiarityIncrease = 0.02;
        let emotionalChange = 0.0;
        let trustChange = 0.0;
        
        const userText = userMessage.toLowerCase();
        
        console.log('💞 Calculating relationship update...');
        
        // Positive interactions
        if (userText.match(/(?:thank you|thanks|appreciate|love|like|great|wonderful|amazing)/)) {
            emotionalChange += 0.05;
            trustChange += 0.02;
        }
        
        // Negative interactions
        if (userText.match(/(?:hate|dislike|terrible|awful|stupid|wrong|bad)/)) {
            emotionalChange -= 0.03;
            trustChange -= 0.01;
        }
        
        // Personal sharing increases trust and familiarity
        if (userText.match(/(?:my|i'm|i am|personal|private|secret|feel|think)/)) {
            trustChange += 0.03;
            familiarityIncrease += 0.02;
        }
        
        // Long conversations
        if (userMessage.length > 100) {
            familiarityIncrease += 0.01;
        }
        
        // Character engagement
        if (characterResponse.length > 50 && /\?/.test(characterResponse)) {
            emotionalChange += 0.02;
        }
        
        // Calculate new values with bounds
        const newTrust = Math.max(0, Math.min(1, currentRelationship.trust_level + trustChange));
        const newFamiliarity = Math.max(0, Math.min(1, currentRelationship.familiarity_level + familiarityIncrease));
        const newEmotionalBond = Math.max(-1, Math.min(1, currentRelationship.emotional_bond + emotionalChange));
        
        const relationshipType = this.determineRelationshipType(newEmotionalBond, newFamiliarity);
        
        console.log(`✅ Relationship updated: ${relationshipType} (trust: ${newTrust.toFixed(2)}, familiarity: ${newFamiliarity.toFixed(2)})`);
        
        return {
            relationship_type: relationshipType,
            trust_level: newTrust,
            familiarity_level: newFamiliarity,
            emotional_bond: newEmotionalBond,
            interaction_count: (currentRelationship.interaction_count || 0) + 1
        };
    }
    
    /**
     * Determine relationship type based on metrics
     */
    determineRelationshipType(emotionalBond, familiarityLevel) {
        if (emotionalBond > 0.7 && familiarityLevel > 0.8) return 'best_friend';
        if (emotionalBond > 0.5 && familiarityLevel > 0.6) return 'close_friend';
        if (emotionalBond > 0.3 && familiarityLevel > 0.4) return 'friend';
        if (emotionalBond > 0.1 && familiarityLevel > 0.3) return 'friendly_acquaintance';
        if (emotionalBond > -0.1 && familiarityLevel > 0.2) return 'acquaintance';
        if (emotionalBond < -0.3) return 'dislike';
        if (familiarityLevel < 0.1) return 'stranger';
        return 'neutral';
    }
    
    // ============================================================================
    // IMAGE MANAGEMENT
    // ============================================================================
    
    async updateCharacterImage(userId, characterId, imageData) {
        try {
            const updateData = {
                avatar_image_url: imageData.url,
                avatar_image_filename: imageData.filename,
                uses_custom_image: imageData.useCustomImage,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('characters')
                .update(updateData)
                .eq('id', characterId)
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating character image:', error);
            throw error;
        }
    }
    
    async updateUserPersonaImage(userId, imageData) {
        try {
            const { data, error } = await this.supabase
                .from('user_personas')
                .update({
                    avatar_image_url: imageData.url,
                    avatar_image_filename: imageData.filename,
                    uses_custom_image: imageData.useCustomImage,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('is_active', true)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating persona image:', error);
            throw error;
        }
    }
    
    async updateScenarioImage(userId, scenarioId, imageData) {
        try {
            const { data, error } = await this.supabase
                .from('scenarios')
                .update({
                    background_image_url: imageData.url,
                    background_image_filename: imageData.filename,
                    uses_custom_background: imageData.useCustomImage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', scenarioId)
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating scenario image:', error);
            throw error;
        }
    }
    
    async deleteImage(userId, filename, type) {
        try {
            const { error: storageError } = await this.supabase.storage
                .from('user-images')
                .remove([`${userId}/${type}/${filename}`]);
            
            if (storageError) throw storageError;
            
            const { error: dbError } = await this.supabase
                .from('user_images')
                .delete()
                .eq('user_id', userId)
                .eq('filename', `${userId}/${type}/${filename}`)
                .eq('type', type);
            
            if (dbError) throw dbError;
            return true;
        } catch (error) {
            console.error('Database error deleting image:', error);
            throw error;
        }
    }
}

module.exports = DatabaseService;
