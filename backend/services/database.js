// backend/services/database.js
// Complete structure with proper method placement

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class DatabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }
        
        // CRITICAL: Use environment variable for encryption key
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required for secure API key storage');
        }
        
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Create a proper 32-byte key from the environment variable
        this.encryptionKey = crypto
        .createHash('sha256')
        .update(process.env.ENCRYPTION_KEY)
        .digest();
    }
    
    // ============================================================================
    // SECURE ENCRYPTION UTILITIES
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
            // Handle legacy base64 encoding (for migration period only)
            if (encryptedData.algorithm === 'base64') {
                console.warn('WARNING: Found legacy base64 encoded API key. Please re-save your API keys.');
                return Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
            }
            
            // Proper AES-GCM decryption
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
            throw new Error('Failed to decrypt API key. The encryption key may have changed.');
        }
    }
    
    async migrateApiKeys(userId) {
        try {
            const { data, error } = await this.supabase
            .from('user_settings')
            .select('openai_key_encrypted, anthropic_key_encrypted')
            .eq('user_id', userId)
            .single();
            
            if (error || !data) return;
            
            let needsUpdate = false;
            const updates = {};
            
            // Check and migrate OpenAI key
            if (data.openai_key_encrypted) {
                const encData = JSON.parse(data.openai_key_encrypted);
                if (encData.algorithm === 'base64') {
                    const decrypted = Buffer.from(encData.encrypted, 'base64').toString('utf8');
                    updates.openai_key_encrypted = JSON.stringify(this.encryptApiKey(decrypted));
                    needsUpdate = true;
                }
            }
            
            // Check and migrate Anthropic key
            if (data.anthropic_key_encrypted) {
                const encData = JSON.parse(data.anthropic_key_encrypted);
                if (encData.algorithm === 'base64') {
                    const decrypted = Buffer.from(encData.encrypted, 'base64').toString('utf8');
                    updates.anthropic_key_encrypted = JSON.stringify(this.encryptApiKey(decrypted));
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                await this.supabase
                .from('user_settings')
                .update(updates)
                .eq('user_id', userId);
                
                console.log('Successfully migrated API keys to secure encryption');
            }
            
        } catch (error) {
            console.error('Error migrating API keys:', error);
        }
    }
    //========================================
    async saveChatMessage(sessionId, messageData) {
        try {
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
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error saving chat message:', error);
            throw error;
        }
    }
    
    /**
     * Get character learning data with enhanced insights
     */
    async getCharacterLearning(characterId, userId) {
        try {
            const { data, error } = await this.supabase
            .from('character_learning')
            .select('*')
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            
            // If no learning data exists, create default
            if (!data) {
                const defaultLearning = {
                    character_id: characterId,
                    user_id: userId,
                    total_interactions: 0,
                    topics_discussed: [],
                    emotional_patterns: [],
                    avg_response_quality: 0.5,
                    learning_insights: [],
                    last_interaction: null
                };
                
                const { data: newLearning, error: createError } = await this.supabase
                .from('character_learning')
                .insert(defaultLearning)
                .select()
                .single();
                
                if (createError) throw createError;
                return newLearning;
            }
            
            return data;
        } catch (error) {
            console.error('Database error getting character learning:', error);
            throw error;
        }
    }
    
    /**
     * Get response feedback analytics
     */
    async getResponseFeedbackAnalytics(characterId, userId, limit = 20) {
        try {
            const { data, error } = await this.supabase
            .from('response_feedback')
            .select('*')
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .order('generated_at', { ascending: false })
            .limit(limit);
            
            if (error) throw error;
            
            // Calculate analytics
            const analytics = {
                totalResponses: data.length,
                averageQuality: 0,
                averageLength: 0,
                userRatings: {
                    average: 0,
                    count: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                },
                qualityTrend: [],
                recentResponses: data.slice(0, 10)
            };
            
            if (data.length > 0) {
                analytics.averageQuality = data.reduce((sum, r) => sum + (r.quality_score || 0), 0) / data.length;
                analytics.averageLength = data.reduce((sum, r) => sum + (r.response_length || 0), 0) / data.length;
                
                // User ratings analytics
                const ratedResponses = data.filter(r => r.user_rating);
                if (ratedResponses.length > 0) {
                    analytics.userRatings.average = ratedResponses.reduce((sum, r) => sum + r.user_rating, 0) / ratedResponses.length;
                    analytics.userRatings.count = ratedResponses.length;
                    
                    ratedResponses.forEach(r => {
                        analytics.userRatings.distribution[r.user_rating]++;
                    });
                }
                
                // Quality trend (last 10 responses)
                analytics.qualityTrend = data.slice(0, 10).reverse().map(r => ({
                    date: r.generated_at,
                    quality: r.quality_score,
                    userRating: r.user_rating
                }));
            }
            
            return analytics;
        } catch (error) {
            console.error('Database error getting feedback analytics:', error);
            throw error;
        }
    }
    // ============================================================================
    // CHARACTER MANAGEMENT - This is where getCharacters starts
    // ============================================================================
    
    async getCharacters(userId) {
        try {
            // Get custom characters
            const { data: customChars, error: customError } = await this.supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
            if (customError) throw customError;
            
            // Get hidden default characters
            const { data: hiddenDefaults, error: hiddenError } = await this.supabase
            .from('hidden_default_characters')
            .select('character_id')
            .eq('user_id', userId);
            
            if (hiddenError) throw hiddenError;
            
            const hiddenDefaultIds = new Set(hiddenDefaults.map(h => h.character_id));
            
            // Default characters (defined in application)
            const defaultCharacters = [
                {
                    id: 'maya',
                    name: 'Maya',
                    personality: 'Energetic art student who loves creativity, colors, and seeing the artistic side of everything. Optimistic and playful with a tendency to get excited about visual concepts.',
                    avatar: '🎨',
                    color: 'from-pink-500 to-purple-500',
                    response_style: 'playful',
                    is_default: true
                },
                {
                    id: 'alex',
                    name: 'Alex',
                    personality: 'Thoughtful philosophy major who asks deep questions about human nature, meaning, and existence. Contemplative and curious, often references philosophical concepts.',
                    avatar: '🤔',
                    color: 'from-blue-500 to-indigo-500',
                    response_style: 'contemplative',
                    is_default: true
                },
                {
                    id: 'zoe',
                    name: 'Zoe',
                    personality: 'Sarcastic tech enthusiast with quick wit and dry humor. Knowledgeable about technology and internet culture, slightly cynical but ultimately caring.',
                    avatar: '💻',
                    color: 'from-green-500 to-teal-500',
                    response_style: 'witty',
                    is_default: true
                },
                {
                    id: 'finn',
                    name: 'Finn',
                    personality: 'Laid-back musician who goes with the flow and relates everything back to music, lyrics, or cultural moments. Supportive and chill with a creative soul.',
                    avatar: '🎸',
                    color: 'from-orange-500 to-red-500',
                    response_style: 'chill',
                    is_default: true
                }
            ];
            
            // Filter out hidden defaults and combine with custom characters
            const visibleDefaults = defaultCharacters.filter(char => !hiddenDefaultIds.has(char.id));
            const allCharacters = [...visibleDefaults, ...(customChars || [])];
            
            return {
                characters: allCharacters,
                total: allCharacters.length
            };
            
        } catch (error) {
            console.error('Database error getting characters:', error);
            throw error;
        }
    }
    
    async createCharacter(userId, characterData) {
        try {
            const { data, error } = await this.supabase
            .from('characters')
            .insert({
                user_id: userId,
                name: characterData.name,
                personality: characterData.personality,
                avatar: characterData.avatar || '🤖',
                color: characterData.color || 'from-gray-500 to-slate-500',
                response_style: 'custom',
                // Add support for custom images
                avatar_image_url: characterData.avatar_image_url || null,
                avatar_image_filename: characterData.avatar_image_filename || null,
                uses_custom_image: characterData.uses_custom_image || false
            })
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error creating character:', error);
            throw error;
        }
    }
    
    /**
     * Update an existing character with image support
     */
    async updateCharacter(userId, characterId, updates) {
        try {
            // Check if it's a default character being modified
            const defaultCharacterIds = ['zoe', 'finn'];
            
            if (defaultCharacterIds.includes(characterId)) {
                // Create a new custom character based on the default
                const newCharacter = {
                    user_id: userId,
                    name: updates.name,
                    personality: updates.personality,
                    avatar: updates.avatar,
                    color: updates.color,
                    response_style: 'custom',
                    is_modified_default: true,
                    original_id: characterId,
                    // Add image support
                    avatar_image_url: updates.avatar_image_url || null,
                    avatar_image_filename: updates.avatar_image_filename || null,
                    uses_custom_image: updates.uses_custom_image || false
                };
                
                const { data, error } = await this.supabase
                .from('characters')
                .insert(newCharacter)
                .select()
                .single();
                
                if (error) throw error;
                
                // Hide the original default character
                await this.hideDefaultCharacter(userId, characterId);
                
                return data;
            } else {
                // Update existing custom character
                const updateData = {
                    name: updates.name,
                    personality: updates.personality,
                    avatar: updates.avatar,
                    color: updates.color,
                    updated_at: new Date().toISOString()
                };
                
                // Add image fields if they exist in the updates
                if ('avatar_image_url' in updates) {
                    updateData.avatar_image_url = updates.avatar_image_url;
                }
                if ('avatar_image_filename' in updates) {
                    updateData.avatar_image_filename = updates.avatar_image_filename;
                }
                if ('uses_custom_image' in updates) {
                    updateData.uses_custom_image = updates.uses_custom_image;
                }
                
                const { data, error } = await this.supabase
                .from('characters')
                .update(updateData)
                .eq('id', characterId)
                .eq('user_id', userId)
                .select()
                .single();
                
                if (error) throw error;
                return data;
            }
            
        } catch (error) {
            console.error('Database error updating character:', error);
            throw error;
        }
    }
    async deleteCharacter(userId, characterId) {
        try {
            const defaultCharacterIds = ['maya', 'alex', 'zoe', 'finn'];
            
            if (defaultCharacterIds.includes(characterId)) {
                // Hide default character
                await this.hideDefaultCharacter(userId, characterId);
                return { message: 'Default character hidden', characterId };
            } else {
                // Delete custom character
                const { error } = await this.supabase
                .from('characters')
                .delete()
                .eq('id', characterId)
                .eq('user_id', userId);
                
                if (error) throw error;
                return { message: 'Character deleted', characterId };
            }
            
        } catch (error) {
            console.error('Database error deleting character:', error);
            throw error;
        }
    }
    
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
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            // Return default settings if none exist
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
                
                // Create default settings
                const { data: newSettings, error: createError } = await this.supabase
                .from('user_settings')
                .insert(defaultSettings)
                .select()
                .single();
                
                if (createError) throw createError;
                
                // Convert to frontend format
                return this.convertSettingsToFrontend(newSettings);
            }
            
            // Convert to frontend format
            return this.convertSettingsToFrontend(data);
            
        } catch (error) {
            console.error('Database error getting user settings:', error);
            throw error;
        }
    }
    
    async updateUserSettings(userId, updates) {
        try {
            console.log('🔧 Original updates:', updates);
            
            // Convert frontend format to database format
            const dbUpdates = this.convertSettingsToDatabase(updates);
            console.log('🗄️ Database updates:', dbUpdates);
            
            // Handle API key encryption
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
            
            // Convert back to frontend format
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
    
    // Helper function to convert frontend format to database format
    convertSettingsToDatabase(frontendSettings) {
        const dbSettings = {};
        
        // Map camelCase to snake_case
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
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            // Return default persona if none exists
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
            // First, deactivate any existing active persona
            await this.supabase
            .from('user_personas')
            .update({ is_active: false })
            .eq('user_id', userId);
            
            // Create new active persona
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
            // Get custom scenarios
            const { data: customScenarios, error } = await this.supabase
            .from('scenarios')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Default scenarios (defined in application)
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
    // IMAGE MANAGEMENT METHODS (Add after deleteScenario method)
    // ============================================================================
    /**
     * Update character image
     */
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
    
    /**
     * Update user persona image
     */
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
    
    /**
     * Update scenario background image
     */
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
    
    /**
     * Delete uploaded image from storage and database
     */
    async deleteImage(userId, filename, type) {
        try {
            // Delete from storage
            const { error: storageError } = await this.supabase.storage
            .from('user-images')
            .remove([`${userId}/${type}/${filename}`]);
            
            if (storageError) throw storageError;
            
            // Delete from database
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
    
    
    //============================================================================
    // CHARACTER MEMORY MANAGEMENT
    // ============================================================================
    
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
    
    async addCharacterMemory(characterId, userId, memoryData) {
        try {
            const { data, error } = await this.supabase
            .from('character_memories')
            .insert({
                character_id: characterId,
                user_id: userId,
                memory_type: memoryData.type,
                target_entity: memoryData.target_entity || userId,
                memory_content: memoryData.content,
                importance_score: memoryData.importance_score || 0.5
            })
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error adding character memory:', error);
            throw error;
        }
    }
    
    async updateMemoryAccess(memoryId) {
        try {
            const { error } = await this.supabase
            .rpc('increment_access_count', { memory_id: memoryId });
            
            if (error) throw error;
            return true;
            
        } catch (error) {
            console.error('Database error updating memory access:', error);
            return false;
        }
    }
    
    async clearCharacterMemories(characterId, userId) {
        try {
            // Clear memories
            const { error: memError } = await this.supabase
            .from('character_memories')
            .delete()
            .eq('character_id', characterId)
            .eq('user_id', userId);
            
            if (memError) throw memError;
            
            // Reset relationship
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
    
    async getCharacterRelationship(characterId, userId) {
        try {
            const { data, error } = await this.supabase
            .from('character_relationships')
            .select('*')
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .eq('target_type', 'user')
            .eq('target_id', userId)
            .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            // Return default relationship if none exists
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
    
    async updateCharacterRelationship(characterId, userId, relationshipData) {
        try {
            const { data, error } = await this.supabase
            .from('character_relationships')
            .upsert({
                character_id: characterId,
                user_id: userId,
                target_type: 'user',
                target_id: userId,
                relationship_type: relationshipData.relationship_type,
                trust_level: relationshipData.trust_level,
                familiarity_level: relationshipData.familiarity_level,
                emotional_bond: relationshipData.emotional_bond,
                last_interaction: new Date().toISOString(),
                interaction_count: relationshipData.interaction_count || 1
            })
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error updating character relationship:', error);
            throw error;
        }
    }
    
    async getConversationContext(sessionId, characterId, userId) {
        try {
            const { data, error } = await this.supabase
            .from('conversation_contexts')
            .select('*')
            .eq('session_id', sessionId)
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return data || null;
            
        } catch (error) {
            console.error('Database error getting conversation context:', error);
            throw error;
        }
    }
    
    async updateConversationContext(sessionId, characterId, userId, contextData) {
        try {
            const { data, error } = await this.supabase
            .from('conversation_contexts')
            .upsert({
                session_id: sessionId,
                character_id: characterId,
                user_id: userId,
                context_summary: contextData.summary,
                important_points: contextData.important_points || [],
                last_messages: contextData.last_messages || [],
                token_count: contextData.token_count || 0,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error updating conversation context:', error);
            throw error;
        }
    }
    
    async createConversationSummary(sessionId, summaryText, messageCount) {
        try {
            const { data, error } = await this.supabase
            .from('conversation_summaries')
            .insert({
                session_id: sessionId,
                summary_text: summaryText,
                original_message_count: messageCount
            })
            .select()
            .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Database error creating conversation summary:', error);
            throw error;
        }
    }
    
    async buildCharacterContext(characterId, userId, sessionId = null) {
        try {
            // Get all context data in parallel
            const [userPersona, memories, relationship, conversationContext, learningData] = await Promise.all([
                this.getUserPersona(userId),
                this.getCharacterMemories(characterId, userId, 5),
                this.getCharacterRelationship(characterId, userId),
                sessionId ? this.getConversationContext(sessionId, characterId, userId) : Promise.resolve(null),
                this.getCharacterLearning(characterId, userId)
            ]);
            
            // Enhanced context with learning insights
            const context = {
                userPersona: userPersona.persona,
                memories,
                relationship,
                conversationContext,
                learning: {
                    totalInteractions: learningData.total_interactions,
                    favoriteTopics: learningData.topics_discussed.slice(0, 5),
                    emotionalPatterns: learningData.emotional_patterns.slice(0, 3),
                    averageQuality: learningData.avg_response_quality,
                    insights: learningData.learning_insights.slice(-3) // Recent insights
                }
            };
            
            return context;
            
        } catch (error) {
            console.error('Database error building character context:', error);
            throw error;
        }
    }
    // ============================================================================
    // ADVANCED CHARACTER LEARNING SYSTEM
    // Add to services/database.js
    // ============================================================================
    
    /**
     * Enhanced character learning with conversation analysis
     */
    async processAdvancedLearning(characterId, userId, userMessage, characterResponse, sessionId) {
        try {
            // 1. Conversation Analysis
            const analysis = await this.analyzeConversationDepth(userMessage, characterResponse);
            
            // 2. Update Character Learning
            await this.updateCharacterLearning(characterId, userId, analysis);
            
            // 3. Store Response Feedback
            await this.storeResponseFeedback(characterId, userId, userMessage, characterResponse, analysis.quality);
            
            // 4. Update Conversation Summary
            if (sessionId) {
                await this.updateConversationSummary(sessionId, userMessage, characterResponse, analysis);
            }
            
            // 5. Process Memory Consolidation
            await this.consolidateMemories(characterId, userId);
            
            console.log(`🧠 Advanced learning processed for character ${characterId}`);
            
        } catch (error) {
            console.error('Error in advanced learning process:', error);
            // Don't throw - learning shouldn't break chat
        }
    }
    
    /**
     * Deep conversation analysis using NLP techniques
     */
    async analyzeConversationDepth(userMessage, characterResponse) {
        const analysis = {
            topics: [],
            emotions: [],
            quality: 0.5,
            engagement: 0.5,
            personalDisclosures: [],
            conversationFlow: 'normal'
        };
        
        try {
            const userText = userMessage.toLowerCase();
            const charText = characterResponse.toLowerCase();
            
            // Topic extraction
            const topicPatterns = [
                { pattern: /work|job|career|office|business/, topic: 'work' },
                { pattern: /family|parent|sibling|child|relative/, topic: 'family' },
                { pattern: /hobby|interest|passion|love|enjoy/, topic: 'interests' },
                { pattern: /travel|vacation|trip|journey/, topic: 'travel' },
                { pattern: /music|song|artist|band|album/, topic: 'music' },
                { pattern: /movie|film|show|series|watch/, topic: 'entertainment' },
                { pattern: /food|eat|cook|restaurant|recipe/, topic: 'food' },
                { pattern: /health|exercise|fitness|sport/, topic: 'health' },
                { pattern: /book|read|author|novel|story/, topic: 'literature' },
                { pattern: /technology|computer|internet|app/, topic: 'technology' }
            ];
            
            topicPatterns.forEach(({ pattern, topic }) => {
                if (pattern.test(userText)) {
                    analysis.topics.push(topic);
                }
            });
            
            // Emotion detection
            const emotionPatterns = [
                { pattern: /happy|joy|excited|cheerful|delighted/, emotion: 'happiness', intensity: 0.8 },
                { pattern: /sad|depressed|down|upset|disappointed/, emotion: 'sadness', intensity: 0.7 },
                { pattern: /angry|mad|furious|irritated|annoyed/, emotion: 'anger', intensity: 0.6 },
                { pattern: /worried|anxious|nervous|scared|afraid/, emotion: 'anxiety', intensity: 0.7 },
                { pattern: /surprised|shocked|amazed|astonished/, emotion: 'surprise', intensity: 0.6 },
                { pattern: /proud|accomplished|achieved|successful/, emotion: 'pride', intensity: 0.8 },
                { pattern: /grateful|thankful|appreciate|blessed/, emotion: 'gratitude', intensity: 0.9 }
            ];
            
            emotionPatterns.forEach(({ pattern, emotion, intensity }) => {
                if (pattern.test(userText)) {
                    analysis.emotions.push({ emotion, intensity });
                }
            });
            
            // Personal disclosure detection
            const disclosurePatterns = [
                /my name is|i'm called|call me/,
                /i work as|my job is|i'm a/,
                /i live in|i'm from|my hometown/,
                /my family|my parents|my children/,
                /i feel|i think|i believe|personally/,
                /i love|i hate|i prefer|i enjoy/,
                /my experience|when i was|i remember/,
                /my goal|my dream|i want to|i hope/
            ];
            
            disclosurePatterns.forEach(pattern => {
                const match = userText.match(pattern);
                if (match) {
                    analysis.personalDisclosures.push(match[0]);
                }
            });
            
            // Quality assessment based on response characteristics
            let qualityScore = 0.5;
            
            // Length and detail
            if (characterResponse.length > 50) qualityScore += 0.1;
            if (characterResponse.length > 100) qualityScore += 0.1;
            
            // Question asking (engagement)
            if (/\?/.test(characterResponse)) qualityScore += 0.15;
            
            // Emotional acknowledgment
            if (analysis.emotions.length > 0) {
                const emotionWords = analysis.emotions.map(e => e.emotion).join('|');
                if (new RegExp(emotionWords, 'i').test(characterResponse)) {
                    qualityScore += 0.2;
                }
            }
            
            // Topic relevance
            if (analysis.topics.length > 0) {
                const topicWords = analysis.topics.join('|');
                if (new RegExp(topicWords, 'i').test(characterResponse)) {
                    qualityScore += 0.15;
                }
            }
            
            // Personal response indicators
            if (/i think|i feel|in my experience|personally/i.test(characterResponse)) {
                qualityScore += 0.1;
            }
            
            analysis.quality = Math.min(1.0, qualityScore);
            analysis.engagement = Math.min(1.0, qualityScore + (analysis.personalDisclosures.length * 0.1));
            
            return analysis;
            
        } catch (error) {
            console.error('Error in conversation analysis:', error);
            return analysis; // Return default analysis
        }
    }
    
    /**
     * Update character learning metrics
     */
    async updateCharacterLearning(characterId, userId, analysis) {
        try {
            const { data: existing, error: fetchError } = await this.supabase
            .from('character_learning')
            .select('*')
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .single();
            
            const learningData = {
                character_id: characterId,
                user_id: userId,
                total_interactions: (existing?.total_interactions || 0) + 1,
                topics_discussed: this.mergeTopic(existing?.topics_discussed || [], analysis.topics),
                emotional_patterns: this.mergeEmotions(existing?.emotional_patterns || [], analysis.emotions),
                avg_response_quality: this.calculateNewAverage(
                                                               existing?.avg_response_quality || 0.5,
                                                               existing?.total_interactions || 0,
                                                               analysis.quality
                                                               ),
                learning_insights: this.generateLearningInsights(existing, analysis),
                last_interaction: new Date().toISOString()
            };
            
            const { error } = await this.supabase
            .from('character_learning')
            .upsert(learningData);
            
            if (error) throw error;
            
            console.log(`📊 Character learning updated for ${characterId}`);
            
        } catch (error) {
            console.error('Error updating character learning:', error);
            throw error;
        }
    }
    
    /**
     * Store response feedback for quality tracking
     */
    async storeResponseFeedback(characterId, userId, userMessage, characterResponse, quality) {
        try {
            const { error } = await this.supabase
            .from('response_feedback')
            .insert({
                character_id: characterId,
                user_id: userId,
                user_message: userMessage.substring(0, 500), // Limit length
                character_response: characterResponse.substring(0, 500),
                quality_score: quality,
                response_length: characterResponse.length,
                message_context: this.extractMessageContext(userMessage),
                generated_at: new Date().toISOString()
            });
            
            if (error) throw error;
            
        } catch (error) {
            console.error('Error storing response feedback:', error);
            throw error;
        }
    }
    
    /**
     * Update conversation summary with intelligent summarization
     */
    async updateConversationSummary(sessionId, userMessage, characterResponse, analysis) {
        try {
            // Get existing summary
            const { data: existing } = await this.supabase
            .from('conversation_summaries')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
            const isSignificantTurn = analysis.quality > 0.7 ||
            analysis.emotions.length > 0 ||
            analysis.personalDisclosures.length > 0;
            
            if (isSignificantTurn) {
                const summaryText = this.generateIntelligentSummary(
                                                                    existing?.summary_text || '',
                                                                    userMessage,
                                                                    characterResponse,
                                                                    analysis
                                                                    );
                
                const { error } = await this.supabase
                .from('conversation_summaries')
                .upsert({
                    session_id: sessionId,
                    summary_text: summaryText,
                    key_topics: analysis.topics,
                    emotional_tone: analysis.emotions.map(e => e.emotion),
                    significant_moments: analysis.personalDisclosures,
                    updated_at: new Date().toISOString()
                });
                
                if (error) throw error;
            }
            
        } catch (error) {
            console.error('Error updating conversation summary:', error);
            throw error;
        }
    }
    
    /**
     * Consolidate memories by importance and recency
     */
    async consolidateMemories(characterId, userId) {
        try {
            // Get all memories for this character-user pair
            const { data: memories } = await this.supabase
            .from('character_memories')
            .select('*')
            .eq('character_id', characterId)
            .eq('user_id', userId)
            .order('importance_score', { ascending: false });
            
            if (!memories || memories.length < 10) return; // Not enough memories to consolidate
            
            // Group similar memories
            const consolidatedGroups = this.groupSimilarMemories(memories);
            
            // Keep top important memories and consolidate similar ones
            for (const group of consolidatedGroups) {
                if (group.length > 3) {
                    const consolidated = this.createConsolidatedMemory(group);
                    
                    // Delete old memories in this group (except the most important one)
                    const toDelete = group.slice(1).map(m => m.id);
                    
                    if (toDelete.length > 0) {
                        await this.supabase
                        .from('character_memories')
                        .delete()
                        .in('id', toDelete);
                    }
                    
                    // Update the remaining memory with consolidated content
                    await this.supabase
                    .from('character_memories')
                    .update({
                        memory_content: consolidated.content,
                        importance_score: consolidated.importance,
                        access_count: group.reduce((sum, m) => sum + (m.access_count || 1), 0)
                    })
                    .eq('id', group[0].id);
                }
            }
            
            console.log(`🧠 Memory consolidation completed for character ${characterId}`);
            
        } catch (error) {
            console.error('Error consolidating memories:', error);
            throw error;
        }
    }
    // ============================================================================
    // HELPER FUNCTIONS FOR MEMORY PROCESSING
    // ============================================================================
    
    analyzeConversationForMemories(userMessage, characterResponse, userPersona) {
        const memories = [];
        const conversationText = `${userMessage} ${characterResponse}`.toLowerCase();
        
        // Enhanced pattern matching
        const patterns = {
            personal: [
                { pattern: /my name is (\w+)/i, type: 'identity', importance: 0.9 },
                { pattern: /i'm (\d+) years? old/i, type: 'demographic', importance: 0.8 },
                { pattern: /i work (?:as|at) ([\w\s]+)/i, type: 'profession', importance: 0.8 },
                { pattern: /i live in ([\w\s]+)/i, type: 'location', importance: 0.7 },
                { pattern: /i'm from ([\w\s]+)/i, type: 'origin', importance: 0.7 },
                { pattern: /my favorite ([\w\s]+) is ([\w\s]+)/i, type: 'preference', importance: 0.6 },
                { pattern: /i (love|hate|enjoy|dislike) ([\w\s]+)/i, type: 'preference', importance: 0.6 }
            ],
            emotional: [
                { pattern: /i (?:feel|am feeling) (sad|happy|excited|angry|frustrated|worried|nervous)/i, type: 'emotion', importance: 0.7 },
                { pattern: /(?:that's|this is) (amazing|terrible|wonderful|awful|great|bad)/i, type: 'reaction', importance: 0.5 },
                { pattern: /i'm (proud|ashamed|grateful|disappointed)/i, type: 'emotion', importance: 0.6 }
            ],
            relational: [
                { pattern: /(?:my|our) (relationship|friendship|connection)/i, type: 'relationship', importance: 0.8 },
                { pattern: /you (?:remind me|are like|make me think)/i, type: 'association', importance: 0.6 },
                { pattern: /(?:thank you|thanks|i appreciate)/i, type: 'gratitude', importance: 0.5 }
            ],
            goals: [
                { pattern: /i want to ([\w\s]+)/i, type: 'goal', importance: 0.7 },
                { pattern: /my goal is to ([\w\s]+)/i, type: 'goal', importance: 0.8 },
                { pattern: /i hope to ([\w\s]+)/i, type: 'aspiration', importance: 0.6 }
            ]
        };
        
        // Process each pattern category
        Object.entries(patterns).forEach(([category, patternList]) => {
            patternList.forEach(({ pattern, type, importance }) => {
                const match = userMessage.match(pattern);
                if (match) {
                    memories.push({
                        type: type,
                        content: `User ${type}: ${match[0]}`,
                        importance_score: importance,
                        target_entity: userId,
                        category: category,
                        extracted_value: match[1] || match[0]
                    });
                }
            });
        });
        
        // Context-aware memory enhancement
        if (memories.length > 0) {
            // Boost importance if character showed good understanding
            const showsUnderstanding = /i understand|that makes sense|i can see|i hear you/i.test(characterResponse);
            if (showsUnderstanding) {
                memories.forEach(memory => {
                    memory.importance_score = Math.min(1.0, memory.importance_score + 0.1);
                    memory.content += ' (character showed understanding)';
                });
            }
        }
        
        return memories;
    }
    
    /**
     * Enhanced relationship calculation with learning factors
     */
    calculateRelationshipUpdate(currentRelationship, userMessage, characterResponse, learningData = null) {
        let familiarityIncrease = 0.02;
        let emotionalChange = 0.0;
        let trustChange = 0.0;
        
        const userText = userMessage.toLowerCase();
        const characterText = characterResponse.toLowerCase();
        
        // Base interaction analysis
        if (userText.match(/(?:thank you|thanks|appreciate|love|like|great|wonderful|amazing)/)) {
            emotionalChange += 0.05;
            trustChange += 0.02;
        }
        
        if (userText.match(/(?:hate|dislike|terrible|awful|stupid|wrong|bad)/)) {
            emotionalChange -= 0.03;
            trustChange -= 0.01;
        }
        
        // Personal sharing increases trust and familiarity
        if (userText.match(/(?:my|i'm|i am|personal|private|secret|feel|think)/)) {
            trustChange += 0.03;
            familiarityIncrease += 0.02;
        }
        
        // Long, detailed conversations
        if (userMessage.length > 100) {
            familiarityIncrease += 0.01;
        }
        
        // Character response quality affects relationship
        if (characterResponse.length > 50 && /\?/.test(characterResponse)) {
            emotionalChange += 0.02; // Good engagement
        }
        
        // Learning-based adjustments
        if (learningData && learningData.total_interactions > 10) {
            // Long-term relationship bonuses
            familiarityIncrease += 0.005;
            
            // Quality consistency bonus
            if (learningData.avg_response_quality > 0.7) {
                trustChange += 0.01;
            }
        }
        
        // Calculate new values with bounds
        const newTrust = Math.max(0, Math.min(1, currentRelationship.trust_level + trustChange));
        const newFamiliarity = Math.max(0, Math.min(1, currentRelationship.familiarity_level + familiarityIncrease));
        const newEmotionalBond = Math.max(-1, Math.min(1, currentRelationship.emotional_bond + emotionalChange));
        
        return {
            relationship_type: this.determineRelationshipType(newEmotionalBond, newFamiliarity),
            trust_level: newTrust,
            familiarity_level: newFamiliarity,
            emotional_bond: newEmotionalBond,
            interaction_count: (currentRelationship.interaction_count || 0) + 1
        };
    }
    
    /**
     * Smart relationship type determination
     */
    determineRelationshipType(emotionalBond, familiarityLevel) {
        // More nuanced relationship categorization
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
    // HELPER FUNCTIONS
    // ============================================================================
    
    mergeTopic(existing, newTopics) {
        const combined = [...existing, ...newTopics];
        const topicCounts = {};
        
        combined.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
        
        return Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20) // Keep top 20 topics
        .map(([topic]) => topic);
    }
    
    mergeEmotions(existing, newEmotions) {
        const emotionMap = {};
        
        // Process existing emotions
        existing.forEach(emotion => {
            const key = typeof emotion === 'string' ? emotion : emotion.emotion;
            emotionMap[key] = emotionMap[key] || { count: 0, totalIntensity: 0 };
            emotionMap[key].count++;
            emotionMap[key].totalIntensity += (emotion.intensity || 0.5);
        });
        
        // Process new emotions
        newEmotions.forEach(emotion => {
            const key = emotion.emotion;
            emotionMap[key] = emotionMap[key] || { count: 0, totalIntensity: 0 };
            emotionMap[key].count++;
            emotionMap[key].totalIntensity += emotion.intensity;
        });
        
        // Convert back to array with average intensities
        return Object.entries(emotionMap)
        .map(([emotion, data]) => ({
            emotion,
            averageIntensity: data.totalIntensity / data.count,
            frequency: data.count
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10); // Keep top 10 emotions
    }
    
    calculateNewAverage(currentAvg, count, newValue) {
        if (count === 0) return newValue;
        return ((currentAvg * count) + newValue) / (count + 1);
    }
    
    generateLearningInsights(existing, analysis) {
        const insights = existing?.learning_insights || [];
        
        // Add new insights based on current analysis
        if (analysis.emotions.length > 0) {
            insights.push(`User expressed ${analysis.emotions.map(e => e.emotion).join(', ')} emotions`);
        }
        
        if (analysis.personalDisclosures.length > 0) {
            insights.push('User shared personal information - relationship building opportunity');
        }
        
        if (analysis.topics.length > 2) {
            insights.push(`Multi-topic conversation: ${analysis.topics.join(', ')}`);
        }
        
        // Keep only recent insights (last 10)
        return insights.slice(-10);
    }
    
    extractMessageContext(message) {
        const context = {
            length: message.length,
            hasQuestion: /\?/.test(message),
            isEmotional: /!/.test(message),
            mentions: []
        };
        
        // Extract @mentions or specific references
        const mentionPattern = /@(\w+)|#(\w+)/g;
        let match;
        while ((match = mentionPattern.exec(message)) !== null) {
            context.mentions.push(match[1] || match[2]);
        }
        
        return context;
    }
    
    generateIntelligentSummary(existingSummary, userMessage, characterResponse, analysis) {
        const newContent = `User: ${userMessage.substring(0, 100)}... Character: ${characterResponse.substring(0, 100)}...`;
        
        if (analysis.topics.length > 0) {
            newContent += ` [Topics: ${analysis.topics.join(', ')}]`;
        }
        
        if (analysis.emotions.length > 0) {
            newContent += ` [Emotions: ${analysis.emotions.map(e => e.emotion).join(', ')}]`;
        }
        
        // Intelligent summarization: keep key moments
        const lines = existingSummary.split('\n').filter(line => line.trim());
        
        // If summary is getting too long, compress older content
        if (lines.length > 10) {
            const recentLines = lines.slice(-5);
            const olderContent = `[Earlier conversation covered: ${analysis.topics.slice(0, 3).join(', ')}...]`;
            return [olderContent, ...recentLines, newContent].join('\n');
        }
        
        return existingSummary + '\n' + newContent;
    }
    
    groupSimilarMemories(memories) {
        const groups = [];
        const used = new Set();
        
        memories.forEach((memory, i) => {
            if (used.has(i)) return;
            
            const group = [memory];
            used.add(i);
            
            // Find similar memories
            for (let j = i + 1; j < memories.length; j++) {
                if (used.has(j)) continue;
                
                const similarity = this.calculateMemorySimilarity(memory, memories[j]);
                if (similarity > 0.7) {
                    group.push(memories[j]);
                    used.add(j);
                }
            }
            
            groups.push(group);
        });
        
        return groups;
    }
    
    calculateMemorySimilarity(memory1, memory2) {
        const words1 = memory1.memory_content.toLowerCase().split(/\s+/);
        const words2 = memory2.memory_content.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = new Set([...words1, ...words2]).size;
        
        return commonWords.length / totalWords;
    }
    
    createConsolidatedMemory(group) {
        const contents = group.map(m => m.memory_content);
        const avgImportance = group.reduce((sum, m) => sum + m.importance_score, 0) / group.length;
        
        // Create a consolidated summary
        const consolidatedContent = `Consolidated memory: ${contents[0]} (and ${group.length - 1} related memories)`;
        
        return {
            content: consolidatedContent,
            importance: Math.min(1.0, avgImportance + 0.1) // Boost importance for consolidated memories
        };
    }};
module.exports = DatabaseService;
