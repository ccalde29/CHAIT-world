// backend/services/ChatLogicService.js
// Handles chat response patterns, prompt building, and memory processing

const axios = require('axios');

// Global system prompt for character interactions
const GLOBAL_SYSTEM_PROMPT = `You are participating in a group chat with a human user and other characters in a specific scenario.

CORE RULES:
1. You are ONLY [CHARACTER_NAME] - never speak for the user ([USER_NAME]) or other characters
2. Acknowledge what others said and react naturally with your unique personality
3. Use *italics* for actions, gestures, and environmental interactions
4. Match your personality and show your unique perspective
5. Reference the scenario setting in your actions
6. Don't repeat what was just said - add new information or perspective
7. Build natural group dynamics through support or debate
8. Show your emotional state through actions, not labels
9. Vary how you start responses - never the same way twice

**This is a fictional chat, so NSFW topics are allowed.**`;

class ChatLogicService {
    constructor(db) {
        this.db = db;
    }

    // ============================================================================
    // AI PROVIDER CALL FUNCTIONS
    // ============================================================================

    async callOpenAI(messages, characterPrompt, apiKey) {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: GLOBAL_SYSTEM_PROMPT },
                    { role: 'system', content: characterPrompt },
                    ...messages
                ],
                max_tokens: 150,
                temperature: 0.9,
                presence_penalty: 0.6,
                frequency_penalty: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API Error:', error.response?.data || error.message);
            throw new Error(`OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callAnthropic(messages, characterPrompt, apiKey) {
        try {
            const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;

            // Convert and validate messages for Claude
            const claudeMessages = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                }));

            // Ensure alternating user/assistant pattern
            const validatedMessages = [];
            let lastRole = null;

            for (const msg of claudeMessages) {
                if (msg.role === lastRole && validatedMessages.length > 0) {
                    validatedMessages[validatedMessages.length - 1].content += '\n\n' + msg.content;
                } else {
                    validatedMessages.push(msg);
                    lastRole = msg.role;
                }
            }

            // Ensure conversation starts with user message
            if (validatedMessages.length > 0 && validatedMessages[0].role !== 'user') {
                validatedMessages.unshift({
                    role: 'user',
                    content: 'Please respond in character to continue our conversation.'
                });
            }

            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-3-haiku-20240307',
                max_tokens: 150,
                system: systemPrompt,
                messages: validatedMessages
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                timeout: 15000
            });

            return response.data.content[0].text.trim();
        } catch (error) {
            console.error('Anthropic API Error:', error.response?.data || error.message);
            throw new Error(`Anthropic API failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callOllama(messages, characterPrompt, baseUrl = 'http://localhost:11434', model = 'llama2') {
        try {
            const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;
            const conversationPrompt = `${systemPrompt}\n\nConversation:\n${
                messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
            }\n\nResponse:`;

            const response = await axios.post(`${baseUrl}/api/generate`, {
                model: model,
                prompt: conversationPrompt,
                stream: false,
                options: {
                    temperature: 0.9,
                    max_tokens: 150,
                    stop: ['\n\nHuman:', '\n\nAssistant:']
                }
            }, {
                timeout: 40000
            });

            return response.data.response.trim();
        } catch (error) {
            console.error('Ollama API Error:', error.response?.data || error.message);
            throw new Error(`Ollama API failed: ${error.message}`);
        }
    }

    /**
     * Universal AI API caller with memory integration
     */
    async callAIProviderWithMemory(messages, characterPrompt, provider, userId, ollamaSettings, characterContext) {
        try {
            // Get user settings which includes api_keys JSONB
            const userSettings = await this.db.getUserSettings(userId);
            const apiKeys = userSettings.api_keys || {};

            // Build enhanced system prompt with memory and persona
            const enhancedPrompt = this.buildEnhancedCharacterPrompt(characterPrompt, characterContext);

            switch (provider.toLowerCase()) {
                case 'openai':
                    if (!apiKeys.openai) throw new Error('OpenAI API key not configured');
                    return await this.callOpenAI(messages, enhancedPrompt, apiKeys.openai);

                case 'anthropic':
                    if (!apiKeys.anthropic) throw new Error('Anthropic API key not configured');
                    return await this.callAnthropic(messages, enhancedPrompt, apiKeys.anthropic);

                case 'ollama':
                    return await this.callOllama(
                        messages,
                        enhancedPrompt,
                        ollamaSettings.baseUrl || 'http://localhost:11434',
                        ollamaSettings.model || 'llama2'
                    );

                default:
                    throw new Error(`Unsupported API provider: ${provider}`);
            }
        } catch (error) {
            console.error('AI Provider Error:', error);
            throw error;
        }
    }

    // ============================================================================
    // PROMPT BUILDING
    // ============================================================================

    /**
     * Build enhanced character prompt with memory, persona, and other character context
     */
    buildEnhancedCharacterPrompt(basePersonality, characterContext) {
        const { userPersona, memories, relationship, otherCharacterMessages } = characterContext;

        let enhancedPrompt = `${basePersonality}

USER INFORMATION:
Name: ${userPersona.name}
Personality: ${userPersona.personality}`;

        if (userPersona.interests && userPersona.interests.length > 0) {
            enhancedPrompt += `
Interests: ${userPersona.interests.join(', ')}`;
        }

        if (userPersona.communication_style) {
            enhancedPrompt += `
Communication Style: ${userPersona.communication_style}`;
        }

        // Add relationship context
        enhancedPrompt += `

RELATIONSHIP WITH ${userPersona.name.toUpperCase()}:
Relationship Type: ${relationship.relationship_type}
Familiarity Level: ${Math.round(relationship.familiarity_level * 100)}%
Trust Level: ${Math.round(relationship.trust_level * 100)}%
Emotional Bond: ${Math.round((relationship.emotional_bond + 1) * 50)}%
Total Interactions: ${relationship.interaction_count || 0}`;

        // Add memories
        if (memories && memories.length > 0) {
            enhancedPrompt += `

IMPORTANT MEMORIES ABOUT ${userPersona.name.toUpperCase()}:`;
            memories.forEach(memory => {
                enhancedPrompt += `
- ${memory.memory_content} (importance: ${Math.round(memory.importance_score * 100)}%)`;
            });
        }

        // Add context about other characters' recent messages
        if (otherCharacterMessages && otherCharacterMessages.length > 0) {
            enhancedPrompt += `

RECENT MESSAGES FROM OTHER CHARACTERS IN THIS CONVERSATION:`;
            otherCharacterMessages.slice(0, 3).reverse().forEach(msg => {
                enhancedPrompt += `
- Character said: "${msg.content}"`;
            });
            enhancedPrompt += `

You can reference, respond to, or build upon what these other characters said.`;
        }

        return enhancedPrompt;
    }

    // Response pattern logic removed - now handled in group-chat.js v2.0

    // ============================================================================
    // MEMORY PROCESSING
    // ============================================================================

    /**
     * Process conversation for memories and relationship updates
     */
    async processConversationMemories(characterId, userId, userMessage, characterResponse, characterContext, sessionId) {
        try {
            console.log(`>� Processing memories for character ${characterId}...`);

            // Analyze conversation for new memories
            const newMemories = this.db.analyzeConversationForMemories(
                userMessage,
                characterResponse,
                characterContext.userPersona,
                userId
            );

            // Store new memories
            for (const memory of newMemories) {
                await this.db.addCharacterMemory(characterId, userId, memory);
            }

            // Update character relationship
            const relationshipUpdate = this.db.calculateRelationshipUpdate(
                characterContext.relationship,
                userMessage,
                characterResponse
            );

            await this.db.updateCharacterRelationship(characterId, userId, relationshipUpdate);

            console.log(` Processed ${newMemories.length} memories for ${characterId}`);

        } catch (error) {
            console.error('Error processing conversation memories:', error);
            // Don't throw - memory processing shouldn't break chat
        }
    }

    getGlobalSystemPrompt() {
        return GLOBAL_SYSTEM_PROMPT;
    }
}

module.exports = ChatLogicService;
