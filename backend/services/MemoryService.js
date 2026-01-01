// backend/services/MemoryService.js
// Handles character memory and relationship operations

class MemoryService {
    constructor(db) {
        // Accept DatabaseService instance
        this.db = db;
    }

    // ============================================================================
    // CHARACTER MEMORY MANAGEMENT
    // ============================================================================

    /**
     * Get character memories with proper ordering
     */
    async getCharacterMemories(characterId, userId, limit = 10) {
        try {
            return await this.db.getMemoriesByCharacter(characterId, userId, limit);
        } catch (error) {
            console.error('Database error getting character memories:', error);
            throw error;
        }
    }

    /**
     * Add character memory
     */
    async addCharacterMemory(characterId, userId, memoryData) {
        try {
            console.log('Adding memory for character:', characterId);
            
            // Map 'fact' to 'semantic' for database constraint
            let memoryType = memoryData.type || 'semantic';
            if (memoryType === 'fact') {
                memoryType = 'semantic';
            }
            // Ensure valid memory type
            if (!['episodic', 'semantic', 'emotional', 'relational'].includes(memoryType)) {
                memoryType = 'semantic';
            }
            
            const memory = await this.db.createMemory(characterId, userId, {
                memory_type: memoryType,
                content: memoryData.content,
                importance_score: memoryData.importance_score || 0.5
            });
            console.log('Memory added successfully');
            return memory;
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
            await this.db.clearMemoriesForCharacter(characterId, userId);
            // Also clear relationships
            const relationships = await this.db.getRelationshipsForCharacter(characterId, userId);
            for (const rel of relationships) {
                await this.db.deleteRelationship(characterId, userId, rel.target_id);
            }
            return { success: true };
        } catch (error) {
            console.error('Database error clearing memories:', error);
            throw error;
        }
    }

    // ============================================================================
    // CHARACTER RELATIONSHIP MANAGEMENT
    // ============================================================================

    /**
     * Get character relationship
     */
    async getCharacterRelationship(characterId, userId) {
        try {
            const relationship = await this.db.getRelationship(characterId, userId, 'user');
            
            if (!relationship) {
                return {
                    relationship_type: 'neutral',
                    trust_level: 0.5,
                    familiarity_level: 0.1,
                    emotional_bond: 0.0,
                    interaction_count: 0
                };
            }

            return relationship;
        } catch (error) {
            console.error('Database error getting character relationship:', error);
            throw error;
        }
    }

    /**
     * Update character relationship
     */
    async updateCharacterRelationship(characterId, userId, relationshipData) {
        try {
            console.log('Updating relationship for character:', characterId);
            const relationship = await this.db.createOrUpdateRelationship(characterId, userId, {
                target_type: 'user',
                target_id: userId,
                relationship_type: relationshipData.relationship_type || 'neutral',
                trust_level: relationshipData.trust_level ?? 0.5,
                familiarity_level: relationshipData.familiarity_level ?? 0.1,
                emotional_bond: relationshipData.emotional_bond ?? 0.0
            });
            
            console.log('Relationship updated successfully', relationship);
            return relationship;
        } catch (error) {
            console.error('Database error updating character relationship:', error);
            // Don't throw - relationship update shouldn't break chat
            return null;
        }
    }

    /**
     * Analyze character interactions for character-to-character memories
     * @param {string} characterId - The character observing/learning
     * @param {Array} otherCharacterMessages - Recent messages from other characters
     * @param {Object} charactersMap - Map of character IDs to character objects
     * @returns {Array} - Memories about other characters
     */
    analyzeCharacterInteractions(characterId, otherCharacterMessages, charactersMap) {
        const memories = [];
        
        for (const msg of otherCharacterMessages) {
            const otherCharId = msg.character;
            const otherChar = charactersMap[otherCharId];
            if (!otherChar || otherCharId === characterId) continue;
            
            const otherCharName = otherChar.name;
            const content = msg.content.toLowerCase();
            
            // Pattern detection for character traits
            const patterns = [
                { pattern: /\*.*?(?:smiles|laughs|giggles|chuckles)\*/, type: 'relational', 
                  content: `${otherCharName} tends to express joy and humor frequently`, importance: 0.6 },
                { pattern: /\*.*?(?:frowns|sighs|looks away|crosses arms)\*/, type: 'emotional',
                  content: `${otherCharName} showed signs of discomfort or disagreement`, importance: 0.6 },
                { pattern: /(?:i think|i believe|in my opinion|personally)/i, type: 'relational',
                  content: `${otherCharName} prefers expressing personal opinions`, importance: 0.5 },
                { pattern: /(?:absolutely|definitely|clearly|obviously)/i, type: 'relational',
                  content: `${otherCharName} communicates with strong conviction`, importance: 0.5 },
                { pattern: /(?:maybe|perhaps|possibly|i guess)/i, type: 'relational',
                  content: `${otherCharName} tends to be tentative in statements`, importance: 0.5 }
            ];
            
            // Check for trait patterns
            for (const {pattern, type, content: memContent, importance} of patterns) {
                if (pattern.test(content)) {
                    memories.push({
                        type: type,
                        content: memContent,
                        importance_score: importance,
                        target_type: 'character',
                        target_entity: otherCharId
                    });
                }
            }
            
            // Detect strong emotions/reactions in longer messages
            if (content.length > 100 && /[!?]{2,}/.test(msg.content)) {
                const preview = msg.content.replace(/\*/g, '').substring(0, 80);
                memories.push({
                    type: 'emotional',
                    content: `${otherCharName} expressed strong emotions: "${preview}..."`,
                    importance_score: 0.7,
                    target_type: 'character',
                    target_entity: otherCharId
                });
            }
        }
        
        return memories;
    }

    /**
     * Build character context with all relevant data
     */
    async buildCharacterContext(characterId, userId, sessionId = null, otherCharacters = []) {
        try {
            console.log('Building context for character:', characterId);

            const [memories, relationship] = await Promise.all([
                this.getCharacterMemories(characterId, userId, 5),
                this.getCharacterRelationship(characterId, userId)
            ]);

            // Get recent messages from other characters in this session
            let recentCharacterMessages = [];
            if (sessionId && otherCharacters.length > 0) {
                const allMessages = await this.db.getMessagesForSession(sessionId, userId);
                recentCharacterMessages = allMessages
                    .filter(m => otherCharacters.includes(m.character_id))
                    .slice(-5);
            }

            // Load memories about other active characters
            const characterMemories = {};
            for (const otherCharId of otherCharacters) {
                if (otherCharId === characterId) continue;
                
                const charMemories = await this.db.getMemoriesByCharacter(
                    characterId,
                    userId,
                    3,
                    { target_type: 'character', target_entity: otherCharId }
                );
                
                if (charMemories.length > 0) {
                    characterMemories[otherCharId] = charMemories;
                }
            }

            const context = {
                memories,
                relationship,
                characterMemories,
                otherCharacterMessages: recentCharacterMessages
            };

            console.log('Context built successfully');
            return context;

        } catch (error) {
            console.error('Database error building character context:', error);
            // Return minimal context on error
            return {
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

    // ============================================================================
    // CONVERSATION ANALYSIS
    // ============================================================================

    /**
     * Analyze conversation for memories
     */
    analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId) {
        const memories = [];
        const userText = userMessage.toLowerCase();

        console.log('Analyzing conversation for memories...');

        // Enhanced pattern matching
        const patterns = [
            { pattern: /my name is (\w+)/i, type: 'identity', importance: 0.9 },
            { pattern: /(?:call me|they call me|i go by) (\w+)/i, type: 'identity', importance: 0.9 },
            { pattern: /i'm (\d+) years? old/i, type: 'demographic', importance: 0.8 },
            { pattern: /i work (?:as|at) ([\w\s]+)/i, type: 'profession', importance: 0.8 },
            { pattern: /(?:my job is|i'm employed as|i code|i teach) ([\w\s]+)/i, type: 'profession', importance: 0.8 },
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

                console.log('Found memory:', memoryContent);
            }
        });

        // If no patterns matched but message is substantial, create a general memory
        if (memories.length === 0 && userMessage.length > 75) {
            memories.push({
                type: 'conversation',
                content: `Discussed: ${userMessage.substring(0, 100)}`,
                importance_score: 0.2,
                target_entity: userId
            });
        }

        // Boost importance if character showed understanding
        const showsUnderstanding = /i understand|that makes sense|i can see|i hear you/i.test(characterResponse);
        if (showsUnderstanding && memories.length > 0) {
            memories.forEach(memory => {
                memory.importance_score = Math.min(1.0, memory.importance_score + 0.1);
            });
            console.log('Boosted memory importance (character showed understanding)');
        }

        console.log(`Total memories found: ${memories.length}`);
        return memories;
    }

    /**
     * Use AI to extract memories from conversation using character's selected model
     */
    async extractMemoriesWithAI(userMessage, characterResponse, character, userPersona, userId, apiConfig) {
        const characterName = character.name;
        const prompt = `You are analyzing a conversation to extract what a character should remember.

CONVERSATION:
User (${userPersona?.name || 'User'}): "${userMessage}"
${characterName}: "${characterResponse}"

TASK: Extract 0-3 important memories that ${characterName} should store about ${userPersona?.name || 'the user'}.

RULES:
1. Only extract FACTUAL information (preferences, background, emotions, goals, interests)
2. Ignore casual small talk
3. Paraphrase naturally - don't quote verbatim
4. Return NOTHING if there's nothing worth remembering

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "type": "identity|demographic|preference|emotion|goal|interest|personal_fact",
    "content": "Clear, concise memory statement",
    "importance": 0.0-1.0
  }
]

Return ONLY the JSON array, nothing else.`;

        try {
            const AIProviderService = require('./AIProviderService');
            
            const messages = [
                { role: 'system', content: 'You are a memory extraction system. Output only valid JSON.' },
                { role: 'user', content: prompt }
            ];
            
            // Use character's configured model with lower temperature and token limit for extraction
            const memoryCharacter = {
                ai_provider: character.ai_provider,
                ai_model: character.ai_model,
                temperature: 0.3,
                max_tokens: 300
            };
            
            let responseText;
            
            try {
                responseText = await AIProviderService.generateResponse(
                    memoryCharacter,
                    messages,
                    apiConfig,
                    {},
                    {}
                );
            } catch (error) {
                console.log('[Memory] AI provider failed for memory extraction, using regex fallback:', error.message);
                return this.analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId);
            }
            
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.log('[Memory] AI did not return valid JSON, using regex fallback');
                return this.analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId);
            }
            
            const memories = JSON.parse(jsonMatch[0]);
            
            return memories.map(mem => ({
                type: mem.type || 'semantic',
                content: mem.content,
                importance_score: mem.importance || 0.5,
                target_entity: userId
            }));
            
        } catch (error) {
            console.error('[Memory] AI extraction failed:', error);
            return this.analyzeConversationForMemories(userMessage, characterResponse, userPersona, userId);
        }
    }

    /**
     * Calculate relationship update
     */
    calculateRelationshipUpdate(currentRelationship, userMessage, characterResponse) {
        let familiarityIncrease = 0.05; // Base increase (was 0.02)
        let emotionalChange = 0.0;
        let trustChange = 0.0;

        const userText = userMessage.toLowerCase();

        console.log('Calculating relationship update...');

        // Positive interactions (2-3x stronger)
        if (userText.match(/(?:thank you|thanks|appreciate|love|like|great|wonderful|amazing)/)) {
            emotionalChange += 0.15; // was 0.05
            trustChange += 0.08; // was 0.02
        }

        // Negative interactions (2-3x stronger)
        if (userText.match(/(?:hate|dislike|terrible|awful|stupid|wrong|bad)/)) {
            emotionalChange -= 0.09; // was -0.03
            trustChange -= 0.03; // was -0.01
        }

        // Personal sharing increases trust and familiarity (3-4x stronger)
        if (userText.match(/(?:my|i'm|i am|personal|private|secret|feel|think)/)) {
            trustChange += 0.10; // was 0.03
            familiarityIncrease += 0.08; // was 0.02
        }

        // Long conversations (5x stronger)
        if (userMessage.length > 100) {
            familiarityIncrease += 0.05; // was 0.01
        }

        // Character engagement (3x stronger)
        if (characterResponse.length > 50 && /\?/.test(characterResponse)) {
            emotionalChange += 0.06; // was 0.02
        }

        // Calculate new values with bounds
        const newTrust = Math.max(0, Math.min(1, currentRelationship.trust_level + trustChange));
        const newFamiliarity = Math.max(0, Math.min(1, currentRelationship.familiarity_level + familiarityIncrease));
        const newEmotionalBond = Math.max(-1, Math.min(1, currentRelationship.emotional_bond + emotionalChange));

        const relationshipType = this.determineRelationshipType(newEmotionalBond, newFamiliarity);

        console.log(`Relationship updated: ${relationshipType} (trust: ${newTrust.toFixed(2)}, familiarity: ${newFamiliarity.toFixed(2)})`);

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
}

module.exports = MemoryService;
